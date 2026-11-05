// src/components/OptimizationPanel.jsx
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Loader2, Target, CheckCircle2 } from 'lucide-react';
import { propagateFlowsheet } from '../services/flowsheetPropagator';

const PARAM_OPTIONS = {
  Furnace: [{ key: 'duty', label: 'Duty (MW)' }],
  Reactor: [{ key: 'conversion', label: 'Conversion (wt%)' }],
  Exchanger: [{ key: 'duty', label: 'Duty (MW)' }],
  Column: [{ key: 'topSplit', label: 'Top Split Fraction (0-1)' }],
  Pump: [{ key: 'head', label: 'Head (m)' }],
};

const OBJECTIVES = [
  { id: 'max_benzene', label: 'Maximize Benzene Production (kg/h)', maximize: true, targetNode: 'R-6001', targetProp: 'Benzene' },
  { id: 'max_xylene', label: 'Maximize Xylenes Production (kg/h)', maximize: true, targetNode: 'R-6001', targetProp: 'Xylenes' },
  { id: 'min_fuel', label: 'Minimize Reactor Heater Duty (MW)', maximize: false, targetNode: 'H-6001', targetProp: 'duty' },
];

export default function OptimizationPanel({ nodes, edges, liveState }) {
  const [targetNodeId, setTargetNodeId] = useState('H-6001');
  const [targetParam, setTargetParam] = useState('duty');
  const [objectiveId, setObjectiveId] = useState('max_benzene');
  const [minVal, setMinVal] = useState(2.0);
  const [maxVal, setMaxVal] = useState(4.0);
  
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const adjustableNodes = useMemo(() => {
    return nodes.filter(n => PARAM_OPTIONS[n.data.simType] || PARAM_OPTIONS[n.data.type]);
  }, [nodes]);

  const currentParams = useMemo(() => {
    const node = nodes.find(n => n.id === targetNodeId);
    if (!node) return [];
    return PARAM_OPTIONS[node.data.simType] || PARAM_OPTIONS[node.data.type] || [];
  }, [targetNodeId, nodes]);

  // ⭐️ محاسبه همگام و سریع
  const evaluateObjective = (paramVal) => {
    const modifiedNodes = nodes.map(n => {
      if (n.id === targetNodeId) {
        return { ...n, data: { ...n.data, params: { ...n.data.params, [targetParam]: paramVal } } };
      }
      return n;
    });

    try {
      const { results } = propagateFlowsheet(modifiedNodes, edges, {});
      const obj = OBJECTIVES.find(o => o.id === objectiveId);
      const res = results[obj.targetNode];
      
      if (!res) return 0;
      
      if (obj.targetProp === 'Benzene') return res.composition?.Benzene || 0;
      if (obj.targetProp === 'Xylenes') return res.composition?.Xylenes || 0;
      return res[obj.targetProp] || 0;
    } catch (err) {
      return 0;
    }
  };

  const runOptimization = () => {
    setRunning(true);
    setResult(null);
    setHistory([]);

    const obj = OBJECTIVES.find(o => o.id === objectiveId);
    const phi = (Math.sqrt(5) - 1) / 2;
    let a = minVal;
    let b = maxVal;
    let tol = 0.01; 
    let iter = 0;
    let maxIter = 15;

    let c = b - phi * (b - a);
    let d = a + phi * (b - a);
    
    let yc = evaluateObjective(c);
    let yd = evaluateObjective(d);

    const hist = [{ iter: 0, x: (a + b) / 2, y: evaluateObjective((a + b) / 2) }];

    while (Math.abs(b - a) > tol && iter < maxIter) {
      iter++;
      if ((obj.maximize && yc > yd) || (!obj.maximize && yc < yd)) {
        b = d; d = c; yd = yc;
        c = b - phi * (b - a); yc = evaluateObjective(c);
      } else {
        a = c; c = d; yc = yd;
        d = a + phi * (b - a); yd = evaluateObjective(d);
      }
      
      hist.push({ iter, x: (a + b) / 2, y: evaluateObjective((a + b) / 2) });
    }

    const xOpt = (a + b) / 2;
    const yOpt = evaluateObjective(xOpt);

    setHistory(hist);
    setResult({ xOpt, yOpt, iter });
    setRunning(false);
  };

  return (
    <div className="h-full flex gap-4">
      <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto pr-2 border-r border-[#3e3e42]">
        <div className="flex items-center gap-2 text-[11px] text-[#dcdcaa] uppercase tracking-wider mb-2">
          <Target size={14} /> Optimizer Setup
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Objective Function</label>
          <select value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs">
            {OBJECTIVES.map(o => (<option key={o.id} value={o.id}>{o.label}</option>))}
          </select>
        </div>
        <div className="border-t border-[#3e3e42] my-2"></div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Manipulate Equipment</label>
          <select value={targetNodeId} onChange={(e) => {
              setTargetNodeId(e.target.value);
              const node = nodes.find(n => n.id === e.target.value);
              const params = PARAM_OPTIONS[node?.data.simType] || PARAM_OPTIONS[node?.data.type] || [];
              if (params.length > 0) setTargetParam(params[0].key);
            }} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs">
            {adjustableNodes.map(n => (<option key={n.id} value={n.id}>{n.id} ({n.data.type})</option>))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Parameter</label>
          <select value={targetParam} onChange={(e) => setTargetParam(e.target.value)} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs">
            {currentParams.map(p => (<option key={p.key} value={p.key}>{p.label}</option>))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="block text-[10px] text-gray-400 mb-1">Min</label><input type="number" step="0.1" value={minVal} onChange={(e) => setMinVal(parseFloat(e.target.value))} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs font-mono" /></div>
          <div><label className="block text-[10px] text-gray-400 mb-1">Max</label><input type="number" step="0.1" value={maxVal} onChange={(e) => setMaxVal(parseFloat(e.target.value))} className="w-full px-2 py-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs font-mono" /></div>
        </div>
        <button onClick={runOptimization} disabled={running || minVal >= maxVal} className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 bg-[#dcdcaa] text-black rounded text-xs font-semibold hover:bg-[#c8c89a] disabled:opacity-40 disabled:cursor-not-allowed">
          {running ? <><Loader2 size={14} className="animate-spin" /> Optimizing...</> : <><Play size={14} /> Find Optimum</>}
        </button>
        {result && (
          <div className="mt-4 p-3 bg-[#4ec9b0]/10 border border-[#4ec9b0]/40 rounded-lg space-y-2">
            <div className="text-[10px] text-[#4ec9b0] font-bold uppercase flex items-center gap-1"><CheckCircle2 size={12} /> Optimum Found</div>
            <div className="flex justify-between items-center"><span className="text-xs text-gray-400">Optimal Value:</span><span className="text-lg font-mono font-bold text-white">{result.xOpt.toFixed(3)}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs text-gray-400">Objective Value:</span><span className="text-sm font-mono font-bold text-[#4ec9b0]">{result.yOpt.toFixed(2)}</span></div>
            <div className="text-[10px] text-gray-500 text-right mt-1">Converged in {result.iter} iterations</div>
          </div>
        )}
      </div>
      <div className="flex-1 h-full pt-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 gap-2">
            <Target size={32} className="text-[#dcdcaa]/50 mb-2" /><span>Select an objective and click "Find Optimum".</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="iter" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} />
              <Line type="monotone" dataKey="y" name="Objective" stroke="#4ec9b0" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="x" name="Param" stroke="#007acc" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}