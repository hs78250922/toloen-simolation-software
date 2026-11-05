// src/components/LiveTrend.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getHistory, checkHealth } from '../services/api';

const MAX_POINTS = 60;

export default function LiveTrend({ isSimulating, runMode }) {
  const [data, setData] = useState([]);
  const [selectedVar, setSelectedVar] = useState('reactorTemp');
  const [backendOnline, setBackendOnline] = useState(null);

  const variables = {
    reactorTemp: { label: 'Reactor Inlet Temp (°C)', shortLabel: 'Rx Temp', color: '#f44747', ref: runMode === 'EOR' ? 480 : 375, domain: runMode === 'EOR' ? [460, 500] : [365, 390], key: 'reactor_inlet_temp_C' },
    h2f:         { label: 'H2/F Ratio (mol/mol)', shortLabel: 'H2/F', color: '#007acc', ref: 4.0, domain: [3.8, 4.3], key: 'h2f_ratio' },
    conversion:  { label: 'Toluene Conversion (wt%)', shortLabel: 'Conv.', color: '#4ec9b0', ref: 47.5, domain: [44, 50], key: 'conversion_wt' },
    fuel:        { label: 'H-6001 Fuel Duty (MW)', shortLabel: 'H-6001 Duty', color: '#c586c0', ref: runMode === 'EOR' ? 4.18 : 2.30, domain: runMode === 'EOR' ? [3.9, 4.4] : [2.1, 2.5], key: 'H-6001_MW' },
    catalyst:    { label: 'Catalyst Activity (0-1)', shortLabel: 'Cat. Act.', color: '#dcdcaa', ref: 1.0, domain: [0.4, 1.05], key: 'catalyst_activity' },
  };

  // Poll backend every 2 seconds
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const healthy = await checkHealth();
      if (!cancelled) setBackendOnline(healthy);
      if (!healthy) return;

      const history = await getHistory(MAX_POINTS);
      if (!cancelled && history.length > 0) {
        const mapped = history.map(h => ({
          time: h.time,
          reactorTemp: h.reactor_inlet_temp_C,
          h2f: h.h2f_ratio,
          conversion: h.conversion_wt,
          fuel: h['H-6001_MW'],
          catalyst: h.catalyst_activity,
          status: h.status,
        }));
        setData(mapped);
      }
    }

    poll(); // initial
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Clear on mode change
  useEffect(() => { setData([]); }, [runMode]);

  const current = variables[selectedVar];

  if (backendOnline === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 gap-2">
        <div className="text-[#f44747] text-sm font-bold">⚠️ Backend Offline</div>
        <div>Please start the Python backend:</div>
        <code className="bg-black/50 px-3 py-1 rounded border border-[#3e3e42] text-[#4ec9b0] text-[11px]">
          cd backend &amp;&amp; python main.py
        </code>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 mb-2 items-center">
        {Object.entries(variables).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setSelectedVar(key)}
            className={`px-3 py-1 text-[10px] rounded border transition-colors ${
              selectedVar === key
                ? 'bg-[#007acc]/20 text-[#007acc] border-[#007acc]/40'
                : 'bg-transparent text-gray-400 border-[#3e3e42] hover:bg-white/5'
            }`}
          >{cfg.shortLabel}</button>
        ))}
        <span className={`ml-auto text-[10px] flex items-center gap-1 ${backendOnline ? 'text-[#4ec9b0]' : 'text-[#f44747]'}`}>
          <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-[#4ec9b0]' : 'bg-[#f44747]'} ${isSimulating ? 'animate-pulse' : ''}`}></span>
          Backend: {backendOnline ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className="flex-1 w-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            {isSimulating ? 'Waiting for backend data...' : 'Press "Run Simulation" to start live monitoring.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="time" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 10 }} domain={current.domain}
                label={{ value: current.label, angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }}
                formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, current.shortLabel]}
                labelFormatter={(label) => `Process Time: ${label} min`}
              />
              <ReferenceLine y={current.ref} stroke="#f44747" strokeDasharray="5 5"
                label={{ value: `Target ${current.ref}`, fill: '#f44747', fontSize: 10, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey={selectedVar} stroke={current.color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.length > 0 && (
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className="text-gray-400">Current:</span>
          <span className="font-mono font-bold" style={{ color: current.color }}>
            {data[data.length - 1][selectedVar]?.toFixed(3)}
          </span>
          <span className="text-gray-500 text-[10px]">Samples: {data.length}/{MAX_POINTS}</span>
          {data[data.length - 1].status && data[data.length - 1].status !== 'normal' && (
            <span className="text-[#f44747] text-[10px] ml-auto animate-pulse">
              ⚠ {data[data.length - 1].status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}