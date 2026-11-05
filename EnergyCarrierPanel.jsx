// src/components/EnergyCarrierPanel.jsx
import React, { useMemo } from 'react';
import { Zap, Flame, Snowflake, AlertCircle } from 'lucide-react';
import { ENERGY_CARRIERS } from '../data/energyCarriers';

export default function EnergyCarrierPanel({ nodes }) {
  // محاسبه مصرف یوتیلیتی‌ها
  const utilityUsage = useMemo(() => {
    const usage = {};
    
    // مقداردهی اولیه
    ENERGY_CARRIERS.forEach(c => {
      usage[c.id] = { ...c, totalDemandMW: 0, totalFlow: 0, totalCost: 0, equipment: [] };
    });

    (nodes || []).forEach(n => {
      const simType = n.data.simType;
      const params = n.data.params || {};
      const duty = Math.abs(Number(params.duty ?? 0));
      
      if (duty <= 0) return;

      // تعیین حامل انرژی پیش‌فرض بر اساس نوع تجهیز
      let carrierId = null;
      if (simType === 'Furnace') carrierId = 'FUEL_GAS';
      else if (simType === 'Exchanger') {
        carrierId = params.heating ? (n.data.utility || 'HPS') : 'COOLING_WATER';
      } else if (simType === 'AirCooler') carrierId = 'ELECTRICITY'; // فن‌ها
      
      // اگر کاربر حامل انرژی اختصاصی انتخاب کرده باشد
      if (n.data.utility && ENERGY_CARRIERS.some(c => c.id === n.data.utility)) {
        carrierId = n.data.utility;
      }

      if (carrierId && usage[carrierId]) {
        const carrier = usage[carrierId];
        carrier.totalDemandMW += duty;
        carrier.equipment.push({ id: n.id, duty, params });

        // محاسبه دبی بر اساس نوع
        if (carrierId === 'FUEL_GAS') {
          // 1 MW = 3.412 MMBtu/h
          const flow = duty * 3.412;
          carrier.totalFlow += flow;
          carrier.totalCost += flow * carrier.costPerUnit;
        } else if (carrierId === 'COOLING_WATER') {
          // Q = m * Cp * dT -> m = Q / (4.18 * 10)
          // duty (MW) = 1000 kJ/s -> flow kg/s = 1000 / (4.18*10) = 23.9 kg/s = 86 ton/h = 86 m3/h
          const flow = duty * 86; 
          carrier.totalFlow += flow;
          carrier.totalCost += flow * carrier.costPerUnit;
        } else if (carrierId === 'ELECTRICITY') {
          // فرض برق مصرفی فن‌ها و پمپ‌ها (kW) = MW * 1000
          const flow = duty * 1000 * 0.1; // ضریب تقریبی برای فن
          carrier.totalFlow += flow;
          carrier.totalCost += flow * carrier.costPerUnit;
        } else {
          // بخار (HPS/MPS/LPS)
          // Q = m * deltaH -> m (kg/h) = Q(MW) * 3600 / deltaH(kJ/kg)
          const flowKgH = (duty * 3600 * 1000) / carrier.deltaH;
          const flowTonH = flowKgH / 1000;
          carrier.totalFlow += flowTonH;
          carrier.totalCost += flowTonH * carrier.costPerUnit;
        }
      }
    });

    return Object.values(usage).filter(u => u.totalDemandMW > 0);
  }, [nodes]);

  const totalCost = utilityUsage.reduce((sum, u) => sum + u.totalCost, 0);

  const getIcon = (type) => {
    if (type === 'hot') return <Flame size={14} className="text-[#f44747]" />;
    if (type === 'cold') return <Snowflake size={14} className="text-[#007acc]" />;
    return <Zap size={14} className="text-[#dcdcaa]" />;
  };

  return (
    <div className="h-full w-full flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-[#dcdcaa] uppercase tracking-wider">
          <Zap size={14} /> Energy Carriers / Utilities Summary
        </div>
        <div className="px-2 py-0.5 bg-[#f44747]/20 border border-[#f44747]/40 rounded text-xs font-bold text-[#f44747]">
          Total Cost: ${totalCost.toFixed(0)} / h
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-[#3e3e42] rounded">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead className="bg-[#252526] sticky top-0 z-10">
            <tr className="text-gray-400 border-b border-[#3e3e42]">
              <th className="p-2 font-normal">Utility</th>
              <th className="p-2 font-normal text-right">Total Demand (MW)</th>
              <th className="p-2 font-normal text-right">Consumption</th>
              <th className="p-2 font-normal text-right">Unit Cost</th>
              <th className="p-2 font-normal text-right">Total Cost ($/h)</th>
              <th className="p-2 font-normal">Consumers</th>
            </tr>
          </thead>
          <tbody>
            {utilityUsage.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-500">
                  No energy utilities in use. Assign utilities to equipment (via Double-Click).
                </td>
              </tr>
            ) : (
              utilityUsage.map(u => (
                <tr key={u.id} className="border-b border-[#3e3e42]/50 hover:bg-white/5 transition-colors">
                  <td className="p-2 font-bold text-white flex items-center gap-2">
                    {getIcon(u.type)}
                    {u.name}
                  </td>
                  <td className="p-2 text-right font-mono text-[#dcdcaa]">{u.totalDemandMW.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono text-[#4ec9b0]">
                    {u.totalFlow.toFixed(1)} <span className="text-[9px] text-gray-500">{u.unit}</span>
                  </td>
                  <td className="p-2 text-right font-mono text-gray-400">${u.costPerUnit.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono font-bold text-[#f44747]">${u.totalCost.toFixed(0)}</td>
                  <td className="p-2 font-mono text-[9px] text-gray-400">
                    {u.equipment.map(e => e.id).join(', ')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}