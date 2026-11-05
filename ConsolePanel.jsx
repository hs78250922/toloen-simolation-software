// src/components/AnalysisPanel.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Terminal, BarChart3, PieChart } from 'lucide-react';

// داده‌های استخراج شده از JSON
const energyBalanceData = [
  { name: 'H-6001 (SOR)', Duty: 2.299, fill: '#007acc' },
  { name: 'H-6002 (SOR)', Duty: 31.29, fill: '#f44747' },
  { name: 'E-6001 (Recovery)', Duty: 46.65, fill: '#4ec9b0' },
  { name: 'E-6009 (Recovery)', Duty: 32.34, fill: '#4ec9b0' },
];

const pinchAnalysisData = [
  { name: 'Min Hot Utility', MW: 33.5, fill: '#4ec9b0' },
  { name: 'Actual Fuel (SOR)', MW: 33.6, fill: '#007acc' },
  { name: 'Potential Saving (15%)', MW: 5.04, fill: '#f44747' },
];

export default function AnalysisPanel({ isSimulating }) {
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
        const newLog = `[${time}] Iteration ${Math.floor(Math.random() * 100)}: Calculating Reactor R-6001... H2/F ratio = ${(4.0 + Math.random()*0.2).toFixed(2)}`;
        setLogs(prev => [...prev.slice(-4), newLog]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-[#3e3e42] bg-[#252526]">
        <button 
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-4 py-2 text-xs border-r border-[#3e3e42] ${activeTab === 'console' ? 'bg-[#1e1e1e] text-white' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <Terminal size={14} /> Simulation Console
        </button>
        <button 
          onClick={() => setActiveTab('energy')}
          className={`flex items-center gap-2 px-4 py-2 text-xs border-r border-[#3e3e42] ${activeTab === 'energy' ? 'bg-[#1e1e1e] text-white' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <BarChart3 size={14} /> Energy Balance (MW)
        </button>
        <button 
          onClick={() => setActiveTab('pinch')}
          className={`flex items-center gap-2 px-4 py-2 text-xs border-r border-[#3e3e42] ${activeTab === 'pinch' ? 'bg-[#1e1e1e] text-white' : 'text-gray-400 hover:bg-white/5'}`}
        >
          <PieChart size={14} /> Pinch Analysis
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-hidden relative">
        
        {/* Console Tab */}
        {activeTab === 'console' && (
          <div className="h-full overflow-y-auto font-mono text-[11px] text-[#4ec9b0] bg-[#0a0a0a] p-2 rounded">
            {logs.map((log, idx) => (
              <div key={idx} className="mb-1">{log}</div>
            ))}
            {isSimulating && <div className="animate-pulse">_</div>}
          </div>
        )}

        {/* Energy Balance Tab */}
        {activeTab === 'energy' && (
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyBalanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} label={{ value: 'Duty (MW)', angle: -90, position: 'insideLeft', fill: '#888' }} />
                <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff' }} />
                <Bar dataKey="Duty" radius={[4, 4, 0, 0]}>
                  {energyBalanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pinch Analysis Tab */}
        {activeTab === 'pinch' && (
          <div className="h-full w-full flex gap-4">
             <div className="w-1/3 text-xs text-gray-300 space-y-2 pt-4">
                <h4 className="text-sm font-bold text-[#007acc] mb-2">Pinch Insights</h4>
                <p>Minimum Hot Utility: <span className="text-white font-bold">~33.5 MW</span></p>
                <p>Actual Fuel SOR: <span className="text-white font-bold">33.6 MW</span></p>
                <p>Current Efficiency: <span className="text-[#4ec9b0] font-bold">High (Near Target)</span></p>
                <div className="mt-4 p-2 bg-[#f44747]/10 border border-[#f44747] rounded text-[11px]">
                  <p className="text-[#f44747] font-bold mb-1">Optimization Opportunity:</p>
                  Reduce H-6002 duty via heat recovery from Air Coolers to save up to 15% (5.04 MW).
                </div>
             </div>
             <div className="w-2/3 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pinchAnalysisData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                    <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff' }} />
                    <Bar dataKey="MW" radius={[0, 4, 4, 0]} barSize={30}>
                      {pinchAnalysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}