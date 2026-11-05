// src/components/PhaseEnvelopePanel.jsx
import React, { useState, useEffect } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Loader2 } from 'lucide-react';
import { getPhaseEnvelope } from '../services/api';

export default function PhaseEnvelopePanel({ nodes }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const feedNode = nodes.find(n => n.id === 'S-FEED');
      const feedComp = feedNode?.data?.design?.composition || { Benzene: 44.84, Toluene: 54.86, Xylenes: 0.2, H2: 0.1 };
      
      const result = await getPhaseEnvelope(feedComp);
      if (result && result.length > 0) setData(result);
      setLoading(false);
    }
    fetchData();
  }, [nodes]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[11px] text-[#dcdcaa] uppercase tracking-wider">
          <Thermometer size={14} /> Phase Envelope (P-T Diagram)
        </div>
        <div className="text-[10px] text-gray-500">Peng-Robinson EOS • Live Backend Calculation</div>
      </div>
      <div className="flex-1 w-full bg-[#1e1e1e] border border-[#3e3e42] rounded relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-[#007acc] gap-2">
            <Loader2 size={16} className="animate-spin" /> Calculating Thermodynamics...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            Failed to generate phase envelope.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="T" type="number" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} domain={['dataMin - 10', 'dataMax + 10']} label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5, fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} domain={[0, 'dataMax + 5']} label={{ value: 'Pressure (bar)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} />
              <Line type="monotone" dataKey="P_bubble" stroke="#4ec9b0" strokeWidth={2} dot={false} name="Bubble Point" />
              <Line type="monotone" dataKey="P_dew" stroke="#007acc" strokeWidth={2} dot={false} name="Dew Point" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}