// src/components/KineticsPanel.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Zap, TrendingDown, Loader2 } from 'lucide-react';
import { getKineticsData } from '../services/api';

export default function KineticsPanel() {
  const [arrhenius, setArrhenius] = useState([]);
  const [deactivation, setDeactivation] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data = await getKineticsData(350, 450);
      if (data) {
        setArrhenius(data.arrhenius);
        setDeactivation(data.deactivation);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-xs text-[#007acc] gap-2"><Loader2 size={16} className="animate-spin" /> Loading Kinetics...</div>;
  }

  return (
    <div className="h-full w-full flex gap-4">
      <div className="flex-1 flex flex-col bg-[#1e1e1e] border border-[#3e3e42] rounded p-3">
        <div className="flex items-center gap-2 text-[11px] text-[#4ec9b0] uppercase tracking-wider mb-3">
          <Zap size={14} /> Reaction Rate vs Temperature
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={arrhenius} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="T" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} />
              <Line type="monotone" dataKey="rate" stroke="#4ec9b0" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-[#1e1e1e] border border-[#3e3e42] rounded p-3">
        <div className="flex items-center gap-2 text-[11px] text-[#f44747] uppercase tracking-wider mb-3">
          <TrendingDown size={14} /> Catalyst Deactivation
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={deactivation} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f44747" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f44747" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="day" stroke="#888" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 10 }} domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: '#252526', borderColor: '#3e3e42', color: '#fff', fontSize: 11 }} />
              <Area type="monotone" dataKey="activity" stroke="#f44747" fillOpacity={1} fill="url(#colorAct)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}