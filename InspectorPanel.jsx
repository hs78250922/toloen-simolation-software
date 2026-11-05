// src/components/InspectorPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, History, Gauge, TrendingUp, PieChart } from 'lucide-react';

const COMP_COLORS = {
  H2: '#4ec9b0',
  Benzene: '#dcdcaa',
  Toluene: '#f44747',
  Xylenes: '#007acc',
  C9Plus: '#c586c0'
};

export default function InspectorPanel({ selectedNode, runMode = 'SOR' }) {
  const [activeTab, setActiveTab] = useState('ops');
  const [trendData, setTrendData] = useState([]);
  const lastPointRef = useRef(null);

  const nodeId = selectedNode?.id;

  useEffect(() => {
    setTrendData([]);
    lastPointRef.current = null;
  }, [nodeId]);

  useEffect(() => {
    if (!selectedNode?.data?.computed) return;
    const comp = selectedNode.data.computed;

    const pointSignature = `${comp.T_out}-${comp.P_out}`;
    if (pointSignature === lastPointRef.current) return;
    lastPointRef.current = pointSignature;

    const newPoint = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      T_out: comp.T_out,
      P_out: comp.P_out,
      Flow: comp.flow_out ?? comp.flow_in,
    };

    setTrendData(prev => {
      const next = [...prev, newPoint];
      return next.length > 15 ? next.slice(-15) : next;
    });
  }, [selectedNode?.data?.computed]);

  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 p-4 text-center gap-2">
        <Activity size={32} className="text-[#3e3e42] mb-2" />
        <p>Select an equipment on the PFD canvas to view live conditions, log sheet, and efficiency.</p>
      </div>
    );
  }

  const { label, type, simType, params = {}, computed = {} } = selectedNode.data;

  const getEfficiency = () => {
    if (simType === 'Reactor') return { label: 'Conversion', value: computed.conversion ?? params.conversion ?? 47.5, unit: '%', max: 55, color: '#4ec9b0' };
    if (['Compressor', 'Pump'].includes(simType)) return { label: 'Isentropic Eff.', value: (params.efficiency ?? 0.75) * 100, unit: '%', max: 100, color: '#007acc' };
    if (simType === 'Furnace') return { label: 'Thermal Eff.', value: (params.efficiency ?? 0.85) * 100, unit: '%', max: 100, color: '#f44747' };
    if (simType === 'Exchanger' || simType === 'AirCooler') return { label: 'Duty Utilization', value: Math.min(100, ((computed.duty || params.duty || 1) / (params.duty || 1)) * 100), unit: '%', max: 100, color: '#dcdcaa' };
    if (simType === 'Column') return { label: 'Reflux Ratio', value: params.refluxRatio || 1, unit: '', max: 10, color: '#9cdcfe' };
    return { label: 'Efficiency', value: 100, unit: '%', max: 100, color: '#4ec9b0' };
  };
  const eff = getEfficiency();

  // ⭐️ استفاده از ترکیب‌های محاسبه‌شده
  const inputComp = computed.inputComposition || { H2: 0, Benzene: 44.84, Toluene: 54.86, Xylenes: 0.2, C9Plus: 0.1 };
  const outletComp = computed.composition;
  const topComp = computed.top?.composition;
  const bottomComp = computed.bottom?.composition;

  const tabBtn = (id, label, icon) => (
    <button onClick={() => setActiveTab(id)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] border-b-2 transition-colors ${activeTab === id ? 'border-[#007acc] text-white bg-[#007acc]/10' : 'border-transparent text-gray-400 hover:text-white'}`}>
      {icon} {label}
    </button>
  );

  const CompositionBar = ({ comp, title }) => {
    if (!comp) return null;
    return (
      <div className="mb-3">
        <div className="text-[9px] text-gray-400 uppercase mb-1.5">{title}</div>
        <div className="space-y-1">
          {Object.entries(comp).map(([key, val]) => {
            if (val < 0.1) return null;
            return (
              <div key={key} className="flex items-center gap-2 text-[10px]">
                <div className="w-14 text-right text-gray-500 truncate">{key}</div>
                <div className="flex-1 h-2 bg-[#1e1e1e] rounded overflow-hidden">
                  <div className="h-full rounded-r" style={{ width: `${val}%`, backgroundColor: COMP_COLORS[key] }}></div>
                </div>
                <div className="w-8 font-mono text-white text-right">{val.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#3e3e42] bg-[#1e1e1e]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{label}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${computed.isLive ? 'bg-[#007acc]/20 text-[#007acc] border-[#007acc]/40' : 'bg-[#4ec9b0]/20 text-[#4ec9b0] border-[#4ec9b0]/40'}`}>
            {computed.isLive ? 'LIVE' : 'SIMULATED'}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{type} • Mode: {runMode}</p>
      </div>

      <div className="flex border-b border-[#3e3e42] bg-[#252526]">
        {tabBtn('ops', 'Process', <Gauge size={12} />)}
        {tabBtn('comp', 'Composition', <PieChart size={12} />)}
        {tabBtn('log', 'Trend', <History size={12} />)}
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
        
        {activeTab === 'ops' && (
          <>
            <div className="p-3 bg-[#1e1e1e] rounded border border-[#3e3e42]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Performance / Efficiency</div>
                <TrendingUp size={14} style={{ color: eff.color }} />
              </div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-bold font-mono" style={{ color: eff.color }}>{eff.value.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mb-1">{eff.unit}</div>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{eff.label}</div>
              <div className="w-full h-1.5 bg-[#3e3e42] rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (eff.value / eff.max) * 100)}%`, backgroundColor: eff.color }}></div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#4ec9b0] uppercase tracking-wider mb-2 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0]"></span> Inlet Conditions</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Temperature</div><div className="text-[11px] font-mono text-white">{computed.T_in?.toFixed(1) ?? '—'} °C</div></div>
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Pressure</div><div className="text-[11px] font-mono text-white">{computed.P_in?.toFixed(2) ?? '—'} bar</div></div>
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Flow</div><div className="text-[11px] font-mono text-white">{computed.flow_in?.toLocaleString(undefined, {maximumFractionDigits: 0}) ?? '—'} kg/h</div></div>
              </div>

              <div className="text-[10px] text-[#f44747] uppercase tracking-wider mb-2 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f44747]"></span> Outlet Conditions</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Temperature</div><div className="text-[11px] font-mono text-white">{computed.T_out?.toFixed(1) ?? '—'} °C</div></div>
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Pressure</div><div className="text-[11px] font-mono text-white">{computed.P_out?.toFixed(2) ?? '—'} bar</div></div>
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Flow</div><div className="text-[11px] font-mono text-white">{computed.flow_out?.toLocaleString(undefined, {maximumFractionDigits: 0}) ?? '—'} kg/h</div></div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'comp' && (
          <div>
            <div className="text-[10px] text-[#4ec9b0] uppercase tracking-wider mb-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0]"></span> Inlet Composition (wt%)
            </div>
            <CompositionBar comp={inputComp} title="Feed Stream" />

            <div className="text-[10px] text-[#f44747] uppercase tracking-wider mb-3 mt-4 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f44747]"></span> Outlet Composition (wt%)
            </div>
            
            {topComp || bottomComp ? (
              <>
                {topComp && <CompositionBar comp={topComp} title="Overhead / Vapor (VAP)" />}
                {bottomComp && <CompositionBar comp={bottomComp} title="Bottoms / Liquid (LIQ)" />}
              </>
            ) : (
              outletComp ? <CompositionBar comp={outletComp} title="Outlet Stream" /> : <div className="text-gray-500 text-[10px]">Not propagated yet.</div>
            )}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-[160px] border border-[#3e3e42] rounded bg-[#1e1e1e] p-2">
              {trendData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[10px] text-gray-500">No historical data yet. Run simulation or Propagate.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                    <XAxis dataKey="time" tick={{ fill: '#888', fontSize: 8 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 8 }} domain={['auto', 'auto']} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#888', fontSize: 8 }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 10 }} />
                    <Line yAxisId="left" type="monotone" dataKey="T_out" name="T (°C)" stroke="#f44747" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="P_out" name="P (bar)" stroke="#4ec9b0" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-2 flex-shrink-0">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Recent Records</div>
              <div className="overflow-auto max-h-[100px] border border-[#3e3e42] rounded">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-[#252526] sticky top-0">
                    <tr className="text-gray-500">
                      <th className="p-1 font-normal">Time</th>
                      <th className="p-1 font-normal text-right">Temp (°C)</th>
                      <th className="p-1 font-normal text-right">Press (bar)</th>
                      <th className="p-1 font-normal text-right">Flow (kg/h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.slice().reverse().map((row, i) => (
                      <tr key={i} className="border-t border-[#3e3e42]/50 hover:bg-white/5">
                        <td className="p-1 text-gray-400 font-mono">{row.time}</td>
                        <td className="p-1 text-right font-mono text-[#f44747]">{row.T_out?.toFixed(1)}</td>
                        <td className="p-1 text-right font-mono text-[#4ec9b0]">{row.P_out?.toFixed(2)}</td>
                        <td className="p-1 text-right font-mono text-gray-300">{row.Flow?.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                      </tr>
                    ))}
                    {trendData.length === 0 && (
                      <tr><td colSpan="4" className="p-2 text-center text-gray-500">No records</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}