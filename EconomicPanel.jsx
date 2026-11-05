// src/components/EconomicPanel.jsx
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

// نرخ‌های پیش‌فرض بازار (قابل تغییر توسط کاربر)
const DEFAULT_PRICES = {
  tolueneFeed: 850,      // $/ton
  benzeneProduct: 1050,  // $/ton
  xylenesProduct: 950,   // $/ton
  fuelGas: 4.50,         // $/MMBtu (معادل تقریبی 15 $/MWh)
  electricity: 0.08,     // $/kWh
  hpSteam: 18,           // $/ton
};

export default function EconomicPanel({ liveState, nodes }) {
  const [prices, setPrices] = useState(DEFAULT_PRICES);

  const handlePriceChange = (key, val) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // ============ محاسبات اقتصادی ============
  const economics = useMemo(() => {
    // دبی‌ها (kg/h)
    const tolueneFlow = 80954;
    const benzeneFlow = liveState?.benzene_kg_h ?? 54435;
    const xylenesFlow = liveState?.xylenes_kg_h ?? 25687;
    
    // مصرف یوتیلیتی
    const fuelMW = liveState?.total_fuel_MW ?? 33.59;
    const electricityKW = 850; // kW (تقریبی از JSON)
    
    // تبدیل به تن در ساعت (ton/h)
    const tolueneTonH = tolueneFlow / 1000;
    const benzeneTonH = benzeneFlow / 1000;
    const xylenesTonH = xylenesFlow / 1000;

    // هزینه‌ها ($/h)
    const tolueneCost = tolueneTonH * prices.tolueneFeed;
    // تبدیل MW به MMBtu/h (1 MWh = 3.412 MMBtu)
    const fuelCost = fuelMW * 3.412 * prices.fuelGas;
    const electricityCost = electricityKW * prices.electricity;
    
    // درآمدها ($/h)
    const benzeneRevenue = benzeneTonH * prices.benzeneProduct;
    const xylenesRevenue = xylenesTonH * prices.xylenesProduct;

    const totalCost = tolueneCost + fuelCost + electricityCost;
    const totalRevenue = benzeneRevenue + xylenesRevenue;
    const netMargin = totalRevenue - totalCost;

    return {
      tolueneCost,
      fuelCost,
      electricityCost,
      totalCost,
      benzeneRevenue,
      xylenesRevenue,
      totalRevenue,
      netMargin,
      netMarginPerTon: totalRevenue > 0 ? netMargin / (benzeneTonH + xylenesTonH) : 0,
    };
  }, [liveState, prices]);

  const costData = [
    { name: 'Toluene Feed', value: economics.tolueneCost, fill: '#f44747' },
    { name: 'Fuel Gas', value: economics.fuelCost, fill: '#c586c0' },
    { name: 'Electricity', value: economics.electricityCost, fill: '#dcdcaa' },
  ];

  const revenueData = [
    { name: 'Benzene', value: economics.benzeneRevenue, fill: '#4ec9b0' },
    { name: 'Xylenes', value: economics.xylenesRevenue, fill: '#007acc' },
  ];

  return (
    <div className="h-full w-full flex gap-4">
      {/* ستون چپ: ورودی نرخ‌ها */}
      <div className="w-64 flex-shrink-0 border-r border-[#3e3e42] pr-3 overflow-y-auto space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-[#dcdcaa] uppercase tracking-wider mb-2">
          <DollarSign size={14} /> Market Prices
        </div>
        
        <div className="space-y-2">
          {[
            { key: 'tolueneFeed', label: 'Toluene Feed', unit: '$/ton' },
            { key: 'benzeneProduct', label: 'Benzene Product', unit: '$/ton' },
            { key: 'xylenesProduct', label: 'Xylenes Product', unit: '$/ton' },
            { key: 'fuelGas', label: 'Fuel Gas', unit: '$/MMBtu' },
            { key: 'electricity', label: 'Electricity', unit: '$/kWh' },
          ].map(p => (
            <div key={p.key}>
              <label className="block text-[9px] text-gray-500 uppercase mb-0.5">{p.label} ({p.unit})</label>
              <input
                type="number"
                step="0.01"
                value={prices[p.key]}
                onChange={(e) => handlePriceChange(p.key, e.target.value)}
                className="w-full px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-[11px] font-mono focus:outline-none focus:border-[#007acc]"
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <div className={`p-2 rounded border flex flex-col items-center justify-center ${
            economics.netMargin >= 0 ? 'bg-[#4ec9b0]/10 border-[#4ec9b0]/40' : 'bg-[#f44747]/10 border-[#f44747]/40'
          }`}>
            <div className="text-[10px] text-gray-400 uppercase mb-1">Net Margin</div>
            <div className={`text-xl font-bold font-mono ${economics.netMargin >= 0 ? 'text-[#4ec9b0]' : 'text-[#f44747]'}`}>
              {economics.netMargin >= 0 ? '+' : ''}{economics.netMargin.toFixed(0)}
            </div>
            <div className="text-[10px] text-gray-500">$ / hour</div>
          </div>
        </div>
      </div>

      {/* ستون راست: نمودارها و خلاصه */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {/* خلاصه مالی */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
            <div className="text-[9px] text-gray-500 uppercase">Total Revenue</div>
            <div className="text-sm font-bold text-[#4ec9b0] font-mono">${economics.totalRevenue.toFixed(0)}/h</div>
          </div>
          <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
            <div className="text-[9px] text-gray-500 uppercase">Total OPEX</div>
            <div className="text-sm font-bold text-[#f44747] font-mono">${economics.totalCost.toFixed(0)}/h</div>
          </div>
          <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
            <div className="text-[9px] text-gray-500 uppercase">Margin / Ton</div>
            <div className={`text-sm font-bold font-mono ${economics.netMarginPerTon >= 0 ? 'text-[#4ec9b0]' : 'text-[#f44747]'}`}>
              ${economics.netMarginPerTon.toFixed(1)}
            </div>
          </div>
        </div>

        {/* نمودارهای دایره‌ای */}
        <div className="flex-1 flex gap-2 min-h-[160px]">
          {/* Costs */}
          <div className="flex-1 bg-[#1e1e1e] rounded border border-[#3e3e42] p-2 flex flex-col">
            <div className="text-[10px] text-[#f44747] uppercase font-bold text-center mb-1 flex items-center justify-center gap-1">
              <TrendingDown size={12} /> Costs Breakdown
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {costData.map((entry, index) => <Cell key={`c-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `$${val.toFixed(0)}/h`} contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue */}
          <div className="flex-1 bg-[#1e1e1e] rounded border border-[#3e3e42] p-2 flex flex-col">
            <div className="text-[10px] text-[#4ec9b0] uppercase font-bold text-center mb-1 flex items-center justify-center gap-1">
              <TrendingUp size={12} /> Revenue Breakdown
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {revenueData.map((entry, index) => <Cell key={`r-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `$${val.toFixed(0)}/h`} contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}