// src/services/processSimulator.js

const DEFAULT_COMP = { H2: 0, Benzene: 44.84, Toluene: 54.86, Xylenes: 0.2, C9Plus: 0.1 };
const HYDROGEN_COMP = { H2: 99.9, Benzene: 0, Toluene: 0, Xylenes: 0, C9Plus: 0.1 };

function simulateFurnace(input, params, design) {
  const Q_MW = params.duty || 0;
  const flow = Math.max(input.flow || 1, 1);
  let Cp_eff = 2.2;
  if (design && design.T_in !== undefined && design.T_out !== undefined && Math.abs(design.T_out - design.T_in) > 0.1) {
    const designFlow = design.flow || 1000;
    Cp_eff = (Q_MW * 3600) / (designFlow * Math.abs(design.T_out - design.T_in));
  }
  const deltaT = (Q_MW * 3600) / (flow * Cp_eff);
  return { T_out: input.T_in + deltaT, P_out: input.P_in - 0.3, flow_out: input.flow, duty: Q_MW, deltaT, composition: input.composition || DEFAULT_COMP };
}

function simulateReactor(input, params, design) {
  const conv = Math.max(0, Math.min(params.conversion ?? 47.5, 55));
  const designRise = (design && design.T_out && design.T_in) ? (design.T_out - design.T_in) : 15;
  const deltaT = designRise * (conv / 47.5);
  
  const comp = { ...(input.composition || DEFAULT_COMP) };
  if (comp.Toluene > 0) {
    const convertedTol = comp.Toluene * (conv / 100);
    comp.Toluene -= convertedTol;
    comp.Benzene += convertedTol * (78 / 92) * 0.95;
    comp.Xylenes += convertedTol * (106 / 92) * 0.95;
    comp.C9Plus += convertedTol * 0.05;
  }

  return { T_out: input.T_in + deltaT, P_out: input.P_in - 0.3, flow_out: input.flow, conversion: conv, deltaT, composition: comp };
}

function simulateExchanger(input, params, design) {
  const Q_MW = params.duty || 0;
  const flow = Math.max(input.flow || 1, 1);
  let Cp_eff = 2.5;
  if (design && design.T_in !== undefined && design.T_out !== undefined && Math.abs(design.T_out - design.T_in) > 0.1) {
    const designFlow = design.flow || 1000;
    Cp_eff = (Q_MW * 3600) / (designFlow * Math.abs(design.T_out - design.T_in));
  }
  const deltaT = (Q_MW * 3600) / (flow * Cp_eff);
  const isHeating = params.heating === true || params.heating === 1;
  const signedDelta = isHeating ? deltaT : -deltaT;
  return { T_out: input.T_in + signedDelta, P_out: input.P_in - (params.dp || 0.2), flow_out: input.flow, duty: Q_MW, deltaT: signedDelta, composition: input.composition || DEFAULT_COMP };
}

function simulateAirCooler(input, params, design) {
  const Q_MW = params.duty || 0;
  const flow = Math.max(input.flow || 1, 1);
  let Cp_eff = 2.2;
  if (design && design.T_in !== undefined && design.T_out !== undefined && Math.abs(design.T_out - design.T_in) > 0.1) {
    const designFlow = design.flow || 1000;
    Cp_eff = (Q_MW * 3600) / (designFlow * Math.abs(design.T_out - design.T_in));
  }
  const deltaT = (Q_MW * 3600) / (flow * Cp_eff);
  return { T_out: input.T_in - deltaT, P_out: input.P_in - 0.1, flow_out: input.flow, duty: Q_MW, deltaT: -deltaT, composition: input.composition || DEFAULT_COMP };
}

function simulateColumn(input, params, design) {
  const splitFraction = params.topSplit ?? 0.5;
  const topFlow = input.flow * splitFraction;
  const bottomFlow = input.flow * (1 - splitFraction);
  
  const inComp = input.composition || DEFAULT_COMP;
  let topComp = { ...inComp };
  let bottomComp = { ...inComp };

  const service = (design?.service || '').toUpperCase();
  if (service.includes('C6/C7')) {
    topComp = { H2: 0, Benzene: 99.9, Toluene: 0.1, Xylenes: 0, C9Plus: 0 };
    bottomComp = { H2: 0, Benzene: inComp.Benzene * 0.01, Toluene: inComp.Toluene, Xylenes: inComp.Xylenes, C9Plus: inComp.C9Plus };
  } else if (service.includes('C7/C8')) {
    topComp = { H2: 0, Benzene: 0, Toluene: inComp.Toluene, Xylenes: inComp.Xylenes * 0.05, C9Plus: 0 };
    bottomComp = { H2: 0, Benzene: 0, Toluene: inComp.Toluene * 0.05, Xylenes: inComp.Xylenes * 0.95, C9Plus: inComp.C9Plus };
  }

  return { 
    T_out: params.T_bottom || 143, P_out: params.P_bottom || 1.1, flow_out: input.flow, 
    top: { T_out: params.T_top || 91, P_out: params.P_top || 0.4, flow_out: topFlow, composition: topComp },
    bottom: { T_out: params.T_bottom || 143, P_out: params.P_bottom || 1.1, flow_out: bottomFlow, composition: bottomComp },
    refluxRatio: params.refluxRatio, stages: params.stages,
    composition: inComp
  };
}

function simulateSeparator(input, params, design) {
  const gasFrac = params.gasFraction ?? 0.35; // D-6002: ~35% گاز
  const gasFlow = input.flow * gasFrac;
  const liquidFlow = input.flow * (1 - gasFrac);
  
  const inComp = input.composition || DEFAULT_COMP;
  
  // ⭐️ هیدروژن عمدتاً به فاز گاز می‌رود
  const gasComp = { 
    H2: Math.min(99, inComp.H2 * 5 + 20), // غنی‌سازی هیدروژن در گاز
    Benzene: inComp.Benzene * 0.1, 
    Toluene: inComp.Toluene * 0.05, 
    Xylenes: 0, 
    C9Plus: 0 
  };
  
  // مایع تقریباً عاری از هیدروژن است
  const liqComp = { 
    H2: 0, 
    Benzene: inComp.Benzene * 0.9, 
    Toluene: inComp.Toluene * 0.95, 
    Xylenes: inComp.Xylenes, 
    C9Plus: inComp.C9Plus 
  };

  return { 
    T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, 
    top: { T_out: input.T_in, P_out: input.P_in, flow_out: gasFlow, composition: gasComp },
    bottom: { T_out: input.T_in, P_out: input.P_in, flow_out: liquidFlow, composition: liqComp },
    composition: inComp
  };
}

function simulatePump(input, params) {
  const head = params.head || 100;
  const rho = 850; const g = 9.81;
  const deltaP_bar = (head * rho * g) / 1e5;
  const T_rise = deltaP_bar * 0.005;
  return { T_out: input.T_in + T_rise, P_out: input.P_in + deltaP_bar, flow_out: input.flow, deltaP: deltaP_bar, power: params.power, composition: input.composition || DEFAULT_COMP };
}

function simulateCompressor(input, params) {
  const ratio = params.pressureRatio || 1.26;
  const k = params.k || 1.49;
  const eff = params.efficiency || 0.78;
  const T_out_K = (input.T_in + 273.15) * Math.pow(ratio, (k - 1) / (k * eff));
  return { T_out: T_out_K - 273.15, P_out: input.P_in * ratio, flow_out: input.flow, deltaP: input.P_in * (ratio - 1), composition: input.composition || HYDROGEN_COMP };
}

function simulateTurbine(input, params) {
  const ratio = params.pressureRatio || 0.35;
  const k = params.k || 1.3;
  const eff = params.efficiency || 0.75;
  const T_out_K = (input.T_in + 273.15) * Math.pow(ratio, (k - 1) / k) * eff;
  return { T_out: T_out_K - 273.15, P_out: input.P_in * ratio, flow_out: input.flow, deltaP: input.P_in * (1 - ratio), composition: input.composition || DEFAULT_COMP };
}

function simulateStream(input) {
  return { T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, composition: input.composition || DEFAULT_COMP };
}

function simulateTank(input) {
  return { T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, composition: input.composition || DEFAULT_COMP };
}

function simulateFilter(input, params) {
  return { T_out: input.T_in, P_out: input.P_in - (params.dp || 0.3), flow_out: input.flow, dp: params.dp, composition: input.composition || DEFAULT_COMP };
}

function simulateDesuperheater(input, params) {
  return { T_out: params.targetT ?? (input.T_in - 20), P_out: input.P_in - 0.5, flow_out: input.flow, bfwFlow: params.bfwFlow, composition: input.composition || DEFAULT_COMP };
}

function simulateDrum(input) {
  return { T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, composition: input.composition || DEFAULT_COMP };
}

const SIMULATORS = {
  Furnace: simulateFurnace, Reactor: simulateReactor, Exchanger: simulateExchanger, AirCooler: simulateAirCooler,
  Column: simulateColumn, Drum: simulateDrum, Separator: simulateSeparator, Pump: simulatePump,
  Compressor: simulateCompressor, Turbine: simulateTurbine, Stream: simulateStream, Tank: simulateTank,
  Filter: simulateFilter, Desuperheater: simulateDesuperheater,
};

export function simulateEquipment(simType, input, params, design = {}) {
  const fn = SIMULATORS[simType];
  if (!fn) return { ...input, T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, composition: input.composition || DEFAULT_COMP };
  try { return fn(input, params, design); } 
  catch (err) { return { ...input, T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, composition: input.composition || DEFAULT_COMP }; }
}

export function fmt(v, unit = '', digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toFixed(digits)}${unit ? ' ' + unit : ''}`;
}