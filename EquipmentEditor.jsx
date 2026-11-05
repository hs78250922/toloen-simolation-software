// src/components/EquipmentEditor.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Lock, Play, Loader2, Network } from 'lucide-react';
import { simulateEquipment, fmt } from '../services/processSimulator';
import { simulateSingleEquipment } from '../services/api';
import { getEquipmentById } from '../data/equipmentCatalog';
import { ENERGY_CARRIERS } from '../data/energyCarriers';

const BASE_IDS = ['H-6001', 'R-6001', 'E-6001', 'T-6002', 'T-6003'];

export default function EquipmentEditor({ node, onSave, onDelete, onClose }) {
  const isBase = BASE_IDS.includes(node?.id);
  const catalogEntry = useMemo(() => getEquipmentById(node?.id), [node?.id]);

  const [tab, setTab] = useState('general');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('');
  const [service, setService] = useState('');
  const [utility, setUtility] = useState('');
  const [input, setInput] = useState({ T_in: 25, P_in: 1, flow: 1000, composition: null });
  const [params, setParams] = useState({});
  const [simResult, setSimResult] = useState(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);

  const design = useMemo(() => node?.data.design || catalogEntry?.design || {}, [node, catalogEntry]);

  // مقداردهی اولیه
  useEffect(() => {
    if (!node) return;
    setLabel(node.data.label || '');
    setType(node.data.type || '');
    setService(node.data.service || catalogEntry?.service || '');
    setUtility(node.data.utility || '');

    const computed = node.data.computed;
    setInput({
      T_in: computed?.T_in ?? design.T_in ?? 25,
      P_in: computed?.P_in ?? design.P_in ?? 1,
      flow: computed?.flow_in ?? design.flow ?? 1000,
      composition: computed?.composition || design.composition || null,
    });
    setParams(node.data.params || catalogEntry?.params || {});
  }, [node, catalogEntry, design]);

  // شبیه‌سازی سریع محلی (پیش‌فرض/آفلاین)
  useEffect(() => {
    if (!node) return;
    const simType = node.data.simType || catalogEntry?.simType || type;
    if (!simType) return;
    try { 
      setSimResult(simulateEquipment(simType, input, params, design)); 
    } catch (err) { 
      console.error(err); 
    }
  }, [input, params, type, node, catalogEntry, design]);

  // کلیدهای میان‌بر
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!node) return null;

  function handleSave() {
    onSave(node.id, {
      ...node.data,
      label: label.trim() || node.data.label,
      type,
      service,
      utility,
      design: input,
      params,
      primary: simResult?.T_out != null ? `${simResult.T_out.toFixed(1)}°C` : node.data.primary,
      secondary: simResult?.P_out != null ? `${simResult.P_out.toFixed(2)} barg` : node.data.secondary,
    });
  }

  // ⭐️ فراخوانی سرویس ترمودینامیک پایتون با مقیاس‌دهی ترکیب
  const handleThermoSimulate = async () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      // مقیاس‌دهی ترکیب بر اساس دبی کل ورودی
      const baseComp = input.composition || { Benzene: 44.84, Toluene: 54.86, Xylenes: 0.2, H2: 0.1, C9Plus: 0.0 };
      const totalBaseMass = Object.values(baseComp).reduce((a, b) => a + b, 0) || 1;
      const scaleFactor = (input.flow || 1000) / totalBaseMass;
      
      const scaledFlows = {};
      Object.keys(baseComp).forEach(k => {
        scaledFlows[k] = baseComp[k] * scaleFactor;
      });
      
      const payload = {
        equipment_id: node.id,
        equipment_type: node.data.simType || type,
        params: params,
        inlet: {
          temperature_c: input.T_in,
          pressure_barg: input.P_in,
          flows_kg_h: scaledFlows
        }
      };
      
      const result = await simulateSingleEquipment(payload);
      
      setSimResult({
        T_out: result.outlet.temperature_c,
        P_out: result.outlet.pressure_barg,
        flow_out: input.flow,
        duty: result.duty_mw,
        enthalpy: result.outlet.enthalpy_kj_kg,
      });
    } catch (err) {
      setSimError(err.message || 'خطا در اتصال به سرویس ترمودینامیک');
    } finally {
      setIsSimulating(false);
    }
  };

  const simType = node.data.simType || catalogEntry?.simType || type;
  const paramFields = getParamFields(simType, params);

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} className={`flex-1 px-2 py-1.5 text-[10px] border-b-2 transition-colors ${tab === id ? 'border-[#007acc] text-white bg-[#007acc]/10' : 'border-transparent text-gray-400 hover:text-white'}`}>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[#252526] border border-[#3e3e42] rounded-lg shadow-2xl w-[540px] max-w-[94vw] max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[#3e3e42]">
          <div>
            <h3 className="text-sm font-bold text-white">{isBase ? 'Equipment Properties' : 'Edit & Simulate Equipment'}</h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{node.id} • {node.data.type} {isBase && <span className="ml-2 text-[#dcdcaa]">• Base (locked)</span>}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 -mr-1"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#3e3e42]">
          {tabBtn('general', 'General')}
          {tabBtn('io', 'Inlet/Outlet')}
          {tabBtn('params', 'Parameters')}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3">
          
          {tab === 'general' && (
            <>
              {isBase && (
                <div className="flex items-start gap-2 p-2 bg-[#007acc]/10 border border-[#007acc]/40 rounded text-[#9cdcfe]">
                  <Lock size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="text-[10px]">Base equipment: live values come from backend.</span>
                </div>
              )}
              <div><label className="block text-[10px] text-gray-400 mb-1">Label / Tag</label><input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs" /></div>
              <div><label className="block text-[10px] text-gray-400 mb-1">Equipment Type</label><input type="text" value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs" /></div>
              <div><label className="block text-[10px] text-gray-400 mb-1">Service Description</label><input type="text" value={service} onChange={(e) => setService(e.target.value)} className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs" /></div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Energy Carrier (Utility)</label>
                <select value={utility} onChange={(e) => setUtility(e.target.value)} className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs">
                  <option value="">— Auto Detect —</option>
                  {ENERGY_CARRIERS.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </>
          )}

          {tab === 'io' && (
            <>
              <div className="text-[10px] text-[#4ec9b0] uppercase mb-2 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0]"></span> Inlet Stream (manual)</div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-[9px] text-gray-500 mb-0.5">T_in (°C)</label><input type="number" step="0.1" value={input.T_in} onChange={(e) => setInput({ ...input, T_in: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-[11px] font-mono" /></div>
                <div><label className="block text-[9px] text-gray-500 mb-0.5">P_in (barg)</label><input type="number" step="0.1" value={input.P_in} onChange={(e) => setInput({ ...input, P_in: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-[11px] font-mono" /></div>
                <div><label className="block text-[9px] text-gray-500 mb-0.5">Flow (kg/h)</label><input type="number" step="1" value={input.flow} onChange={(e) => setInput({ ...input, flow: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-[11px] font-mono" /></div>
              </div>

              <button 
                onClick={handleThermoSimulate} 
                disabled={isSimulating}
                className="flex items-center gap-2 px-3 py-2 mt-4 bg-[#4ec9b0]/20 text-[#4ec9b0] border border-[#4ec9b0]/40 rounded hover:bg-[#4ec9b0]/30 w-full justify-center font-semibold text-[11px] transition-colors disabled:opacity-50"
              >
                {isSimulating ? (
                  <><Loader2 size={14} className="animate-spin" /> Running Thermo Engine...</>
                ) : (
                  <><Play size={14} /> Simulate with Real Thermo (Python)</>
                )}
              </button>
              
              {simError && (
                <div className="mt-2 p-2 bg-[#f44747]/10 border border-[#f44747]/40 text-[#f44747] text-[10px] rounded">
                  ⚠ {simError}
                </div>
              )}

              <div className="text-[10px] text-[#007acc] uppercase mb-2 mt-4 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#007acc]"></span> Computed Outlet</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">T_out (°C)</div><div className="text-[12px] font-mono font-bold text-[#f44747]">{fmt(simResult?.T_out, '', 1)}</div></div>
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">P_out (barg)</div><div className="text-[12px] font-mono font-bold text-[#4ec9b0]">{fmt(simResult?.P_out, '', 2)}</div></div>
                <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 mb-0.5">Flow_out (kg/h)</div><div className="text-[12px] font-mono font-bold text-gray-200">{fmt(simResult?.flow_out, '', 0)}</div></div>
              </div>
            </>
          )}

          {tab === 'params' && (
             <div className="space-y-2">
                {paramFields.map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] text-gray-400 mb-0.5">{f.label} {f.unit && <span className="text-gray-600">({f.unit})</span>}</label>
                    <input type="number" step={f.step || 0.01} value={params[f.key] ?? ''} onChange={(e) => setParams({ ...params, [f.key]: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-[11px] font-mono" />
                  </div>
                ))}
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#3e3e42] bg-black/20 rounded-b-lg">
          <button onClick={() => { onDelete(node.id); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#f44747]/10 text-[#f44747] border border-[#f44747]/40 rounded hover:bg-[#f44747]/20"><Trash2 size={12} /> Delete</button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs bg-[#3e3e42] text-gray-300 rounded hover:bg-gray-600">Cancel</button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#007acc] text-white rounded hover:bg-[#0068b0] font-semibold"><Save size={12} /> Save & Apply</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function getParamFields(simType, params) {
  switch (simType) {
    case 'Furnace': return [{ key: 'duty', label: 'Duty', unit: 'MW', step: 0.01 }];
    case 'Reactor': return [{ key: 'conversion', label: 'Conversion', unit: 'wt%', step: 0.1 }];
    case 'Exchanger': return [{ key: 'duty', label: 'Duty', unit: 'MW', step: 0.01 }, { key: 'heating', label: '1=Heat, 0=Cool', unit: '', step: 1 }];
    case 'AirCooler': return [{ key: 'duty', label: 'Duty', unit: 'MW', step: 0.01 }];
    case 'Column': 
      return [
        { key: 'T_top', label: 'Top Temp', unit: '°C', step: 0.5 },
        { key: 'T_bottom', label: 'Bottom Temp', unit: '°C', step: 0.5 },
        { key: 'topSplit', label: 'Top Flow Fraction (0-1)', unit: '', step: 0.01 },
        { key: 'refluxRatio', label: 'Reflux Ratio', unit: '', step: 0.1 }
      ];
    case 'Separator': return [{ key: 'gasFraction', label: 'Gas Fraction (0-1)', unit: '', step: 0.01 }];
    case 'Pump': return [{ key: 'head', label: 'Head', unit: 'm', step: 1 }, { key: 'efficiency', label: 'Efficiency (0-1)', unit: '', step: 0.01 }];
    case 'Compressor': return [{ key: 'pressureRatio', label: 'Pressure Ratio', unit: '', step: 0.01 }, { key: 'efficiency', label: 'Efficiency (0-1)', unit: '', step: 0.01 }];
    case 'Turbine': return [{ key: 'pressureRatio', label: 'Pressure Ratio', unit: '', step: 0.01 }, { key: 'efficiency', label: 'Efficiency (0-1)', unit: '', step: 0.01 }];
    default: return Object.keys(params || {}).map(k => ({ key: k, label: k, unit: '', step: 0.01 }));
  }
}