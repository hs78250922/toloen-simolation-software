// src/services/flowsheetPropagator.js
import { simulateEquipment } from './processSimulator';
import { getEquipmentById } from '../data/equipmentCatalog';

const BASE_IDS = new Set(['H-6001', 'R-6001', 'E-6001', 'T-6002', 'T-6003']);
const FRESH_FEED_COMP = { H2: 0, Benzene: 44.84, Toluene: 54.86, Xylenes: 0.2, C9Plus: 0.1 };

// ⭐️ بازنویسی موتور راکتور برای وابستگی به دما
function simulateReactorDynamic(input, params, design) {
  // اگر کاربر Conversion را قفل کرده باشد از آن استفاده می‌کند، وگرنه بر اساس دما حساب می‌کند
  let conv = params.conversion;
  if (conv === undefined) {
    const T_ref = design.T_in ?? 375;
    // مدل ساده: به ازای هر ۱۰ درجه افزایش دما، ۰.۵٪ به تبدیل اضافه می‌شود
    conv = 47.5 + (input.T_in - T_ref) * 0.05; 
  }
  conv = Math.max(0, Math.min(conv, 55));

  const comp = { ...input.composition };
  if (comp.Toluene > 0) {
    const convertedTol = comp.Toluene * (conv / 100);
    comp.Toluene -= convertedTol;
    comp.Benzene += convertedTol * (78 / 92) * 0.95;
    comp.Xylenes += convertedTol * (106 / 92) * 0.95;
    comp.C9Plus += convertedTol * 0.05;
  }

  const deltaT = 15 * (conv / 47.5);
  return { 
    T_out: input.T_in + deltaT, 
    P_out: input.P_in - 0.3, 
    flow_out: input.flow, 
    conversion: conv, 
    composition: comp 
  };
}

export function propagateFlowsheet(nodes, edges, liveValues = {}, options = {}) {
  const { maxIterations = 6, tolerance = 0.05 } = options;
  const byId = {};
  nodes.forEach(n => { byId[n.id] = n; });

  const incoming = {}; const outgoing = {};
  nodes.forEach(n => { incoming[n.id] = []; outgoing[n.id] = []; });
  edges.forEach(e => {
    if (incoming[e.target]) incoming[e.target].push(e);
    if (outgoing[e.source]) outgoing[e.source].push(e);
  });

  const inputValues = {};
  const results = {};
  nodes.forEach(n => {
    const cat = getEquipmentById(n.id);
    const d = n.data.design || cat?.design || {};
    inputValues[n.id] = { T_in: d.T_in ?? 25, P_in: d.P_in ?? 1, flow: d.flow ?? 1000, composition: FRESH_FEED_COMP };
  });

  const log = []; let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    const newResults = {};
    const inDeg = {};
    nodes.forEach(n => { inDeg[n.id] = incoming[n.id].length; });
    const queue = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
    const sorted = [];
    while (queue.length > 0) {
      const id = queue.shift(); sorted.push(id);
      outgoing[id].forEach(e => { inDeg[e.target]--; if (inDeg[e.target] === 0) queue.push(e.target); });
    }
    nodes.forEach(n => { if (!sorted.includes(n.id)) sorted.push(n.id); });

    for (const id of sorted) {
      const node = byId[id];
      const cat = getEquipmentById(id);
      const simType = node.data.simType || cat?.simType || node.data.type;
      const params = node.data.params || cat?.params || {};
      const design = node.data.design || cat?.design || {};

      if (simType === 'Stream' && incoming[id].length === 0) {
        const designData = node.data.design || {};
        newResults[id] = {
          T_out: designData.T_in ?? 25, P_out: designData.P_in ?? 1, flow_out: designData.flow ?? 0,
          composition: designData.composition || FRESH_FEED_COMP, isLive: false,
        };
        inputValues[id] = { T_in: designData.T_in ?? 25, P_in: designData.P_in ?? 1, flow: designData.flow ?? 0, composition: designData.composition || FRESH_FEED_COMP };
        continue;
      }

      if (BASE_IDS.has(id) && liveValues[id]) {
        newResults[id] = { ...liveValues[id], isLive: true };
        continue;
      }

      let input;
      const inEdges = incoming[id];
      if (inEdges.length > 0) {
        const ups = inEdges.map(e => {
          const upRes = newResults[e.source] || results[e.source];
          if (!upRes) return null;
          const handle = e.sourceHandle || 'out';
          const streamData = (handle === 'top' || handle === 'bottom') ? upRes[handle] : upRes;
          if (!streamData) return null;
          return { T: streamData.T_out, P: streamData.P_out, F: streamData.flow_out ?? 0, C: streamData.composition || FRESH_FEED_COMP };
        }).filter(Boolean);

        if (ups.length > 0) {
          const totalFlow = ups.reduce((a, u) => a + u.F, 0);
          const avgComp = { H2: 0, Benzene: 0, Toluene: 0, Xylenes: 0, C9Plus: 0 };
          if (totalFlow > 0) {
            ups.forEach(u => {
              Object.keys(avgComp).forEach(k => {
                avgComp[k] += (u.C[k] || 0) * (u.F / totalFlow);
              });
            });
          }

          input = {
            T_in: ups.reduce((a, u) => a + u.T, 0) / ups.length,
            P_in: Math.min(...ups.map(u => u.P)),
            flow: totalFlow,
            composition: totalFlow > 0 ? avgComp : FRESH_FEED_COMP,
          };
        }
      }
      if (!input) input = { ...inputValues[id] };
      inputValues[id] = input;

      try { 
        if (simType === 'Reactor') {
          newResults[id] = simulateReactorDynamic(input, params, design);
        } else {
          newResults[id] = simulateEquipment(simType, input, params, design); 
        }
      }
      catch (err) { newResults[id] = { T_out: input.T_in, P_out: input.P_in, flow_out: input.flow, composition: input.composition }; }
    }

    let maxChange = 0;
    for (const id of sorted) {
      const oldT = results[id]?.T_out ?? 0; const newT = newResults[id]?.T_out ?? 0;
      maxChange = Math.max(maxChange, Math.abs(oldT - newT));
    }

    Object.assign(results, newResults);
    log.push(`Iter ${iter + 1}: max ΔT = ${maxChange.toFixed(3)}°C`);
    if (maxChange < tolerance && iter > 0) { converged = true; log.push(`✓ Converged after ${iter + 1} iteration(s)`); break; }
  }
  return { results, inputValues, log, converged };
}

export function extractLiveValues(nodes, liveState) {
  // ⭐️ تغییر مهم: برای اینکه بهینه‌ساز مقادیر را قفل نکند، این تابع را خالی برمی‌گردانیم
  return {}; 
}