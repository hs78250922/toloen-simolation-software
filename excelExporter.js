// src/services/excelExporter.js
import * as XLSX from 'xlsx';

export function exportToExcel({ nodes, edges, liveState, runMode, alarmHistory }) {
  const wb = XLSX.utils.book_new();

  // ============ Sheet 1: Process State ============
  const stateRows = [
    { Parameter: 'Operating Mode', Value: runMode, Unit: '-', Status: 'Normal' },
    { Parameter: 'Reactor Inlet Temp', Value: liveState?.reactor_inlet_temp_C?.toFixed(2) ?? '375.00', Unit: '°C', Status: '-' },
    { Parameter: 'Reactor Outlet Temp', Value: liveState?.reactor_outlet_temp_C?.toFixed(2) ?? '390.00', Unit: '°C', Status: '-' },
    { Parameter: 'Toluene Conversion', Value: liveState?.conversion_wt?.toFixed(2) ?? '47.50', Unit: 'wt%', Status: '-' },
    { Parameter: 'H2/F Ratio', Value: liveState?.h2f_ratio?.toFixed(3) ?? '4.080', Unit: 'mol/mol', Status: '-' },
    { Parameter: 'Catalyst Activity', Value: ((liveState?.catalyst_activity ?? 1) * 100).toFixed(1), Unit: '%', Status: '-' },
    { Parameter: 'Benzene Production', Value: liveState?.benzene_kg_h?.toFixed(1) ?? '54435.0', Unit: 'kg/h', Status: '-' },
    { Parameter: 'Xylenes Production', Value: liveState?.xylenes_kg_h?.toFixed(1) ?? '25687.0', Unit: 'kg/h', Status: '-' },
  ];
  const wsState = XLSX.utils.json_to_sheet(stateRows);
  wsState['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsState, 'Process State');

  // ============ Sheet 2: Energy Balance ============
  const energyRows = [];
  let totalFuel = 0, totalRecovery = 0, totalCooling = 0;

  (nodes || []).forEach(n => {
    const simType = n.data.simType;
    const params = n.data.params || {};
    let duty = Number(params.duty ?? 0);
    let category = '';

    if (simType === 'Furnace') { totalFuel += duty; category = 'Fuel'; }
    else if (simType === 'Exchanger') {
      if (params.heating === true || params.heating === 1) { totalRecovery += duty; category = 'Recovery'; }
      else { totalCooling += duty; category = 'Cooling'; }
    } else if (simType === 'AirCooler') { totalCooling += duty; category = 'Cooling'; }

    if (duty > 0) {
      energyRows.push({
        'Equipment ID': n.id,
        Type: n.data.type,
        Service: n.data.service || '-',
        'Duty (MW)': duty.toFixed(3),
        Category: category,
      });
    }
  });

  // ردیف‌های خلاصه
  energyRows.push({ 'Equipment ID': 'TOTAL', Type: 'Fuel', Service: '-', 'Duty (MW)': totalFuel.toFixed(3), Category: 'Fuel' });
  energyRows.push({ 'Equipment ID': 'TOTAL', Type: 'Recovery', Service: '-', 'Duty (MW)': totalRecovery.toFixed(3), Category: 'Recovery' });
  energyRows.push({ 'Equipment ID': 'TOTAL', Type: 'Cooling', Service: '-', 'Duty (MW)': totalCooling.toFixed(3), Category: 'Cooling' });

  const wsEnergy = XLSX.utils.json_to_sheet(energyRows);
  wsEnergy['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsEnergy, 'Energy Balance');

  // ============ Sheet 3: Mass Balance ============
  const massRows = [
    { Stream: 'Fresh BT Feed', Type: 'Input', 'Flow (kg/h)': 79073, Source: 'U-500 / U-700' },
    { Stream: 'Fresh Toluene', Type: 'Input', 'Flow (kg/h)': 1881, Source: 'U-700' },
    { Stream: 'Make-up H2', Type: 'Input', 'Flow (kg/h)': 158, Source: 'U-300' },
    { Stream: 'Benzene Product', Type: 'Output', 'Flow (kg/h)': Number(liveState?.benzene_kg_h ?? 54435).toFixed(1), Source: 'T-6002 Side-cut' },
    { Stream: 'C8+ Mixed Xylenes', Type: 'Output', 'Flow (kg/h)': Number(liveState?.xylenes_kg_h ?? 25687).toFixed(1), Source: 'T-6003 Bottoms' },
    { Stream: 'LP Purge Gas', Type: 'Output', 'Flow (kg/h)': 991, Source: 'D-6003' },
  ];
  const wsMass = XLSX.utils.json_to_sheet(massRows);
  wsMass['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsMass, 'Mass Balance');

  // ============ Sheet 4: Equipment List ============
  const equipRows = (nodes || []).map(n => ({
    'Equipment ID': n.id,
    Type: n.data.type,
    'Simulation Type': n.data.simType || '-',
    Service: n.data.service || '-',
    'Live Primary Value': n.data.primary || '-',
    'Live Secondary Value': n.data.secondary || '-',
  }));
  const wsEquip = XLSX.utils.json_to_sheet(equipRows);
  wsEquip['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsEquip, 'Equipment List');

  // ============ Sheet 5: Alarm History ============
  if (alarmHistory && alarmHistory.length > 0) {
    const alarmRows = alarmHistory.map(a => ({
      Time: a.raisedAt,
      Severity: a.severity.toUpperCase(),
      Tag: a.tag || '-',
      Message: a.message,
      'Duration (s)': a.duration ? a.duration.toFixed(0) : '-',
      Status: a.clearedAt ? 'Cleared' : 'Active',
    }));
    const wsAlarms = XLSX.utils.json_to_sheet(alarmRows);
    wsAlarms['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 50 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsAlarms, 'Alarms');
  }

  // ============ Download File ============
  const fileName = `UNIT600_Data_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}