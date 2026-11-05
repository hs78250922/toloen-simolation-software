// src/data/energyCarriers.js
export const ENERGY_CARRIERS = [
  {
    id: 'HPS',
    name: 'High Pressure Steam (HPS)',
    type: 'hot',
    unit: 'ton/h',
    costPerUnit: 18.0, // $/ton
    energyContent: 3.2, // GJ/ton (تقریبی)
    deltaH: 2800, // kJ/kg (برای محاسبه دبی بخار از Duty)
  },
  {
    id: 'MPS',
    name: 'Medium Pressure Steam (MPS)',
    type: 'hot',
    unit: 'ton/h',
    costPerUnit: 12.0,
    energyContent: 2.8,
    deltaH: 2200,
  },
  {
    id: 'LPS',
    name: 'Low Pressure Steam (LPS)',
    type: 'hot',
    unit: 'ton/h',
    costPerUnit: 8.0,
    energyContent: 2.5,
    deltaH: 2000,
  },
  {
    id: 'FUEL_GAS',
    name: 'Fuel Gas',
    type: 'hot',
    unit: 'MMBtu/h',
    costPerUnit: 4.50,
    energyContent: 3.412, // MMBtu per MWh
    deltaH: 0, // مستقیم با MW محاسبه می‌شود
  },
  {
    id: 'COOLING_WATER',
    name: 'Cooling Water (CW)',
    type: 'cold',
    unit: 'm³/h',
    costPerUnit: 0.05,
    energyContent: 0.15, // GJ/m³ (با فرض delta T = 10C)
    deltaH: 41.8, // kJ/kg
  },
  {
    id: 'ELECTRICITY',
    name: 'Electricity',
    type: 'power',
    unit: 'kWh',
    costPerUnit: 0.08,
    energyContent: 0.0036, // GJ/kWh
    deltaH: 0,
  },
];

export const getCarrierById = (id) => ENERGY_CARRIERS.find(c => c.id === id);