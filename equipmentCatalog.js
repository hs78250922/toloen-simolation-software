// src/data/equipmentCatalog.js
export const EQUIPMENT_CATALOG = [
  {
    category: 'Reaction',
    color: '#f44747',
    items: [
      {
        id: 'R-6001', type: 'Reactor', simType: 'Reactor',
        service: 'Disproportionation Reactor',
        specs: 'Fixed Bed • 3600 mm ID • 5000 mm TL-TL • 2.25Cr-1.0Mo',
        design: { T_in: 375, P_in: 29.4, flow: 80954 },
        params: { conversion: 47.5, catalystMass: 35700, adiabaticRise: 15, h2f: 4.08, catalystActivity: 1.0 },
      },
      {
        id: 'H-6001', type: 'Furnace', simType: 'Furnace',
        service: 'Reactor Heater',
        specs: 'Cylindrical Furnace • 2.25Cr-1.0Mo',
        design: { T_in: 354, P_in: 33.2, flow: 80954 },
        params: { duty: 2.299, efficiency: 0.85 },
      },
    ],
  },
  {
    category: 'Distillation Columns',
    color: '#4ec9b0',
    items: [
      {
        id: 'T-6001', type: 'Column', simType: 'Column',
        service: 'Stripper',
        specs: 'Tray Tower • 44 Valve Trays',
        design: { T_in: 175, P_in: 8.6, flow: 62500 },
        params: { T_top: 155, T_bottom: 210, P_top: 8.2, P_bottom: 8.6, refluxRatio: 0.7, stages: 44 },
      },
      {
        id: 'T-6002', type: 'Column', simType: 'Column',
        service: 'C6/C7 Column',
        specs: '66 Valve Trays • 4750 mm dia',
        design: { T_in: 143, P_in: 1.1, flow: 55000 },
        params: { T_top: 91, T_bottom: 143, P_top: 0.4, P_bottom: 1.1, refluxRatio: 3.93, stages: 66 },
      },
      {
        id: 'T-6003', type: 'Column', simType: 'Column',
        service: 'C7/C8 Column',
        specs: '84 Valve Trays',
        design: { T_in: 202, P_in: 7.7, flow: 35000 },
        params: { T_top: 202, T_bottom: 247, P_top: 6.9, P_bottom: 7.7, refluxRatio: 6.01, stages: 84 },
      },
    ],
  },
  {
    category: 'Drums & Separators',
    color: '#9cdcfe',
    items: [
      {
        id: 'D-6001', type: 'Drum', simType: 'Drum',
        service: 'Feed Surge Drum',
        specs: 'Vertical Drum • 4000 mm dia',
        design: { T_in: 108, P_in: 2.0, flow: 80954 },
        params: { volume: 85, level: 50 },
      },
      {
        id: 'D-6002', type: 'Drum', simType: 'Separator',
        service: 'Reactor Product Separator',
        specs: 'Vertical Drum • 27.2 barg',
        design: { T_in: 43, P_in: 27.2, flow: 80954 },
        params: { gasFraction: 0.35, liquidFraction: 0.65 },
      },
    ],
  },
  {
    category: 'Clay Treating',
    color: '#dcdcaa',
    items: [
      {
        id: 'D-6004A', type: 'Clay Treater', simType: 'Filter',
        service: 'Clay Treater A',
        specs: 'Vertical • 199.5 m³ Clay',
        design: { T_in: 150, P_in: 13, flow: 82000 },
        params: { dp: 0.3, clayVolume: 199.5 },
      },
      {
        id: 'E-6007', type: 'Heater', simType: 'Furnace',
        service: 'Clay Treater Heater',
        specs: 'H-BEU Type',
        design: { T_in: 108, P_in: 14, flow: 82000 },
        params: { duty: 2.9, efficiency: 0.9 },
      },
    ],
  },
  {
    category: 'Heat Exchangers',
    color: '#dcdcaa',
    items: [
      {
        id: 'E-6001', type: 'Exchanger', simType: 'Exchanger',
        service: 'Reactor Feed/Effluent Exchanger',
        specs: 'Welded Plate • 46.65 MW',
        design: { T_in: 108, P_in: 30, flow: 80954 },
        params: { duty: 46.65, heating: true, dp: 0.3 },
      },
      {
        id: 'E-6002', type: 'Exchanger', simType: 'Exchanger',
        service: 'Reactor Effluent Trim Cooler',
        specs: 'H-AES',
        design: { T_in: 68, P_in: 27.5, flow: 80954 },
        params: { duty: 2.618, heating: false, dp: 0.2 },
      },
      {
        id: 'E-6009A', type: 'Exchanger', simType: 'Exchanger',
        service: 'C6/C7 Column Reboiler A',
        specs: 'V-BEL • Thermosiphon',
        design: { T_in: 143, P_in: 1.3, flow: 260000 },
        params: { duty: 16.17, heating: true, dp: 0.1 },
      },
    ],
  },
  {
    category: 'Air Coolers',
    color: '#9cdcfe',
    items: [
      {
        id: 'AE-6001', type: 'Air Cooler', simType: 'AirCooler',
        service: 'Reactor Effluent Air Condenser',
        specs: 'Forced Draft • 8 Fans',
        design: { T_in: 250, P_in: 28, flow: 80954 },
        params: { duty: 7.995, approach: 5 },
      },
      {
        id: 'AE-6003', type: 'Air Cooler', simType: 'AirCooler',
        service: 'C6/C7 Column Air Condenser',
        specs: 'Forced Draft • 8 Fans',
        design: { T_in: 91, P_in: 0.4, flow: 215999 },
        params: { duty: 32.172, approach: 5 },
      },
    ],
  },
  {
    category: 'Rotating Equipment',
    color: '#c586c0',
    items: [
      {
        id: 'C-6001', type: 'Compressor', simType: 'Compressor',
        service: 'Recycle Gas Compressor',
        specs: 'Centrifugal • 27.2→34.3 barg',
        design: { T_in: 43, P_in: 27.2, flow: 85000 },
        params: { pressureRatio: 1.26, k: 1.3, efficiency: 0.78 },
      },
      {
        id: 'CT-6001', type: 'Turbine', simType: 'Turbine',
        service: 'Steam Turbine for C-6001',
        specs: 'HP Steam Driven',
        design: { T_in: 400, P_in: 44, flow: 44000 },
        params: { pressureRatio: 0.35, k: 1.3, efficiency: 0.75 },
      },
      {
        id: 'P-6001A', type: 'Pump', simType: 'Pump',
        service: 'Feed Charge Pump A',
        specs: 'Centrifugal • 229.7 kW',
        design: { T_in: 108, P_in: 2, flow: 120 },
        params: { head: 548, efficiency: 0.75, power: 229.7 },
      },
    ],
  },
  {
    category: 'Streams',
    color: '#4ec9b0',
    items: [
      {
        id: 'S-FEED', type: 'Stream', simType: 'Stream',
        service: 'Fresh Feed Stream',
        specs: 'Boundary Input',
        design: { T_in: 25, P_in: 1, flow: 80954 },
        params: {},
      },
      {
        id: 'S-PROD', type: 'Stream', simType: 'Stream',
        service: 'Product Stream',
        specs: 'Boundary Output',
        design: { T_in: 45, P_in: 1, flow: 54435 },
        params: {},
      },
    ],
  },
];

export const ALL_EQUIPMENT = EQUIPMENT_CATALOG.flatMap(cat =>
  cat.items.map(item => ({ ...item, categoryName: cat.category, categoryColor: cat.color }))
);

export const getEquipmentById = (id) => ALL_EQUIPMENT.find(e => e.id === id);
export const searchEquipment = (query) => {
  if (!query || !query.trim()) return ALL_EQUIPMENT;
  const q = query.toLowerCase();
  return ALL_EQUIPMENT.filter(e =>
    e.id.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.service.toLowerCase().includes(q)
  );
};