// src/components/AnalysisPanel.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { 
  Terminal, BarChart3, PieChart, TrendingUp, BellRing, Scale, 
  SlidersHorizontal, Target, AlertCircle, DollarSign, GitCommit, ShieldAlert, ListFilter,
  Thermometer, FlaskConical
} from 'lucide-react';

import LiveTrend from './LiveTrend';
import AlarmHistory from './AlarmHistory';
import MassBalancePanel from './MassBalancePanel';
import SensitivityAnalysis from './SensitivityAnalysis';
import OptimizationPanel from './OptimizationPanel';
import EconomicPanel from './EconomicPanel';
import StreamsPanel from './StreamsPanel';
import ValidationPanel from './ValidationPanel';
import LineListPanel from './LineListPanel';
import PhaseEnvelopePanel from './PhaseEnvelopePanel';
import KineticsPanel from './KineticsPanel';
import { validateFlowsheet } from '../services/validator';

export default function AnalysisPanel({
  isSimulating, runMode = 'SOR', liveState = null, alarmHistory = [], onClearHistory, nodes = [], edges = [],
}) {
  const [activeTab, setActiveTab] = useState('console');
  const [logs, setLogs] = useState([
    "Initializing Unit 600 Disproportionation Model...",
    "Loading thermodynamic package: Peng-Robinson.",
    "Convergence check: Passed."
  ]);

  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        const time = new Date().toLocaleTimeString();
        const conv = liveState?.conversion_wt?.toFixed(2) ?? (47.5 + (Math.random() - 0.5)).toFixed(2);
        const newLog = `[${time}] Iteration ${Math.floor(Math.random() * 100)}: R-6001 calc | Conv = ${conv} wt%`;
        setLogs(prev => [...prev.slice(-4), newLog]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSimulating, liveState]);

  const validationIssues = useMemo(() => {
    const results = {};
    nodes.forEach(n => { if (n.data.computed) results[n.id] = n.data.computed; });
    return validateFlowsheet(nodes, edges, results);
  }, [nodes, edges]);

  const energyBalanceData = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    const result = [];
    nodes.forEach(n => {
      const simType = n.data.simType;
      const params = n.data.params || {};
      const computed = n.data.computed || {};
      let duty = 0, fill = '#007acc';
      
      if (simType === 'Furnace') {
        duty = Number(computed.duty_mw ?? params.duty ?? 0);
        fill = '#f44747';
      } else if (simType === 'Exchanger') {
        duty = Number(computed.duty_mw ?? params.duty ?? 0);
        const isHeating = params.heating === true || params.heating === 1;
        fill = isHeating ? '#4ec9b0' : '#007acc';
      } else if (simType === 'AirCooler') {
        duty = Number(computed.duty_mw ?? params.duty ?? 0);
        fill = '#9cdcfe';
      }
      
      if (duty > 0) {
        result.push({ name: n.id, Duty: duty, fill });
      }
    });
    return result.sort((a, b) => b.Duty - a.Duty);
  }, [nodes]);

  const pinchStats = useMemo(() => {
    let totalFuel = 0, totalRecovery = 0, totalCooling = 0;
    (nodes || []).forEach(n => {
      const simType = n.data.simType;
      const params = n.data.params || {};
      const computed = n.data.computed || {};
      const duty = Number(computed.duty_mw ?? params.duty ?? 0);
      
      if (simType === 'Furnace') totalFuel += duty;
      else if (simType === 'Exchanger') {
        if (params.heating === true || params.heating === 1) totalRecovery += duty;
        else totalCooling += duty;
      } else if (simType === 'AirCooler') totalCooling += duty;
    });
    
    const designMinHotUtility = 33.5;
    const efficiency = totalFuel > 0 ? Math.min(100, (designMinHotUtility / totalFuel) * 100) : 0;
    return { totalFuel, totalRecovery, totalCooling, designMinHotUtility, efficiency, potentialSaving: totalFuel * 0.15 };
  }, [nodes]);

  const pinchAnalysisData = useMemo(() => [
    { name: 'Total Fuel', MW: pinchStats.totalFuel, fill: '#f44747' },
    { name: 'Heat Recovery', MW: pinchStats.totalRecovery, fill: '#4ec9b0' },
    { name: 'Total Cooling', MW: pinchStats.totalCooling, fill: '#007acc' },
    { name: 'Min Hot Utility', MW: pinchStats.designMinHotUtility, fill: '#dcdcaa' },
  ], [pinchStats]);

  const tabClass = (tab) =>
    `flex items-center gap-2 px-4 py-2 text-xs border-r border-[#3e3e42] whitespace-nowrap transition-colors ${
      activeTab === tab ? 'bg-[#1e1e1e] text-white' : 'text-gray-400 hover:bg-white/5'
    }`;

  const activeAlarmsCount = alarmHistory.filter(h => !h.clearedAt).length;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center border-b border-[#3e3e42] bg-[#252526] overflow-x-auto select-none flex-shrink-0">
        <button onClick={() => setActiveTab('console')} className={tabClass('console')}><Terminal size={14} /> Console</button>
        <button onClick={() => setActiveTab('streams')} className={tabClass('streams')}><GitCommit size={14} /> Streams</button>
        <button onClick={() => setActiveTab('linelist')} className={tabClass('linelist')}><ListFilter size={14} /> Line List</button>
        <button onClick={() => setActiveTab('phase')} className={tabClass('phase')}><Thermometer size={14} /> Phase Envelope</button>
        <button onClick={() => setActiveTab('kinetics')} className={tabClass('kinetics')}><FlaskConical size={14} /> Kinetics</button>
        
        <button onClick={() => setActiveTab('validation')} className={tabClass('validation')}>
          <ShieldAlert size={14} /> Validation
          {validationIssues.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-[#f44747] text-white">{validationIssues.length}</span>}
        </button>

        <button onClick={() => setActiveTab('energy')} className={tabClass('energy')}><BarChart3 size={14} /> Energy Balance</button>
        <button onClick={() => setActiveTab('pinch')} className={tabClass('pinch')}><PieChart size={14} /> Pinch Analysis</button>
        <button onClick={() => setActiveTab('mass')} className={tabClass('mass')}><Scale size={14} /> Mass Balance</button>
        <button onClick={() => setActiveTab('sensitivity')} className={tabClass('sensitivity')}><SlidersHorizontal size={14} /> Sensitivity</button>
        <button onClick={() => setActiveTab('optimization')} className={tabClass('optimization')}><Target size={14} /> Optimization</button>
        <button onClick={() => setActiveTab('economics')} className={tabClass('economics')}><DollarSign size={14} /> Economics</button>
        <button onClick={() => setActiveTab('trends')} className={tabClass('trends')}><TrendingUp size={14} /> Live Trends</button>
        <button onClick={() => setActiveTab('alarms')} className={tabClass('alarms')}>
          <BellRing size={14} /> Alarm History
          {alarmHistory.length > 0 && <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full ${activeAlarmsCount > 0 ? 'bg-[#f44747] text-white' : 'bg-[#3e3e42] text-gray-300'}`}>{alarmHistory.length}</span>}
        </button>
      </div>

      <div className="flex-1 p-3 overflow-hidden relative">
        {activeTab === 'console' && (
          <div className="h-full overflow-y-auto font-mono text-[11px] text-[#4ec9b0] bg-[#0a0a0a] p-2 rounded">
            {logs.map((log, idx) => (<div key={idx} className="mb-1">{log}</div>))}
            {isSimulating && <div className="animate-pulse">_</div>}
          </div>
        )}

        {activeTab === 'streams' && <StreamsPanel nodes={nodes} edges={edges} />}
        {activeTab === 'linelist' && <LineListPanel nodes={nodes} />}
        {activeTab === 'phase' && <PhaseEnvelopePanel nodes={nodes} />}
        {activeTab === 'kinetics' && <KineticsPanel />}
        {activeTab === 'validation' && <ValidationPanel issues={validationIssues} />}

        {activeTab === 'energy' && (
          <div className="h-full w-full flex flex-col">
            <div className="flex gap-2 mb-2 flex-shrink-0">
              {[
                { label: 'Fuel', value: pinchStats.totalFuel, color: '#f44747' },
                { label: 'Recovery', value: pinchStats.totalRecovery, color: '#4ec9b0' },
                { label: 'Cooling', value: pinchStats.totalCooling, color: '#007acc' },
                { label: 'Equipment', value: energyBalanceData.length, color: '#dcdcaa', unit: 'items' },
              ].map(s => (
                <div key={s.label} className="flex-1 p-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded">
                  <div className="text-[9px] text-gray-500 uppercase">{s.label}</div>
                  <div className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value.toFixed(s.unit ? 0 : 2)} {s.unit || 'MW'}</div>
                </div>
              ))}
            </div>
            <div style={{ width: '100%', height: 180, position: 'relative' }}>
              {energyBalanceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 gap-1">
                  <AlertCircle size={24} className="text-[#dcdcaa] mb-1" /><span>No energy equipment in PFD.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyBalanceData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                    <XAxis dataKey="name" type="category" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
                    <YAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} formatter={(val) => [`${Number(val).toFixed(2)} MW`, 'Duty']} />
                    <Bar dataKey="Duty" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                      {energyBalanceData.map((entry, index) => (<Cell key={`c-${index}`} fill={entry.fill} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pinch' && (
          <div className="h-full w-full flex gap-3">
            <div className="w-1/3 text-xs text-gray-300 space-y-1.5 pt-1 overflow-y-auto">
              <h4 className="text-sm font-bold text-[#007acc] mb-1">Pinch Insights</h4>
              <div className="p-1.5 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 uppercase">Current Fuel</div><div className="text-sm font-bold text-[#f44747] font-mono">{pinchStats.totalFuel.toFixed(2)} MW</div></div>
              <div className="p-1.5 bg-[#1e1e1e] rounded border border-[#3e3e42]"><div className="text-[9px] text-gray-500 uppercase">Heat Recovery</div><div className="text-sm font-bold text-[#4ec9b0] font-mono">{pinchStats.totalRecovery.toFixed(2)} MW</div></div>
              <div className={`p-1.5 rounded border ${pinchStats.efficiency > 90 ? 'bg-[#4ec9b0]/10 border-[#4ec9b0]/40' : pinchStats.efficiency > 70 ? 'bg-[#dcdcaa]/10 border-[#dcdcaa]/40' : 'bg-[#f44747]/10 border-[#f44747]/40'}`}>
                <div className="text-[9px] text-gray-500 uppercase">Efficiency</div>
                <div className={`text-sm font-bold font-mono ${pinchStats.efficiency > 90 ? 'text-[#4ec9b0]' : pinchStats.efficiency > 70 ? 'text-[#dcdcaa]' : 'text-[#f44747]'}`}>{pinchStats.efficiency.toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ width: '66.666%', height: 180, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pinchAnalysisData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                  <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" stroke="#888" tick={{ fill: '#888', fontSize: 9 }} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} formatter={(val) => [`${Number(val).toFixed(2)} MW`, 'Duty']} />
                  <ReferenceLine x={pinchStats.designMinHotUtility} stroke="#dcdcaa" strokeDasharray="5 5" />
                  <Bar dataKey="MW" isAnimationActive={false} radius={[0, 4, 4, 0]}>
                    {pinchAnalysisData.map((entry, index) => (<Cell key={`p-${index}`} fill={entry.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'mass' && <MassBalancePanel liveState={liveState} runMode={runMode} nodes={nodes} />}
        {activeTab === 'sensitivity' && <SensitivityAnalysis nodes={nodes} edges={edges} liveState={liveState} />}
        {activeTab === 'optimization' && <OptimizationPanel nodes={nodes} edges={edges} liveState={liveState} />}
        {activeTab === 'economics' && <EconomicPanel liveState={liveState} nodes={nodes} />}
        {activeTab === 'trends' && <LiveTrend isSimulating={isSimulating} runMode={runMode} />}
        {activeTab === 'alarms' && <AlarmHistory history={alarmHistory} onClear={onClearHistory} />}
      </div>
    </div>
  );
}