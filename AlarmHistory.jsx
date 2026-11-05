// src/components/AlarmHistory.jsx
import React, { useState, useMemo } from 'react';
import { Download, Trash2, Filter } from 'lucide-react';

export default function AlarmHistory({ history, onClear }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return history;
    return history.filter(h => h.severity === filter);
  }, [history, filter]);

  const exportCSV = () => {
    const header = 'Timestamp,Severity,Tag,Message,Duration_s,Status\n';
    const rows = filtered.map(h => 
      `"${h.raisedAt}","${h.severity}","${h.tag || ''}","${h.message.replace(/"/g, "'")}","${(h.duration || 0).toFixed(1)}","${h.clearedAt ? 'Cleared' : 'Active'}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unit600_alarm_history_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const severityColor = (sev) => ({
    critical: 'text-[#f44747]',
    warning:  'text-[#dcdcaa]',
    info:     'text-[#007acc]',
  }[sev] || 'text-gray-400');

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <Filter size={14} className="text-gray-400" />
        {['all', 'critical', 'warning', 'info'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              filter === f 
                ? 'bg-[#007acc]/20 text-[#007acc] border-[#007acc]/40' 
                : 'bg-transparent text-gray-400 border-[#3e3e42] hover:bg-white/5'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <span className="text-[10px] text-gray-500 ml-2">
          {filtered.length} / {history.length} events
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[#007acc]/20 text-[#007acc] rounded border border-[#007acc]/40 hover:bg-[#007acc]/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={onClear}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[#f44747]/20 text-[#f44747] rounded border border-[#f44747]/40 hover:bg-[#f44747]/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto border border-[#3e3e42] rounded">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            No alarms recorded yet. Run the simulation to generate events.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="bg-[#252526] sticky top-0">
              <tr className="text-gray-400 text-left">
                <th className="px-2 py-1 font-normal border-b border-[#3e3e42]">Time</th>
                <th className="px-2 py-1 font-normal border-b border-[#3e3e42]">Severity</th>
                <th className="px-2 py-1 font-normal border-b border-[#3e3e42]">Tag</th>
                <th className="px-2 py-1 font-normal border-b border-[#3e3e42]">Message</th>
                <th className="px-2 py-1 font-normal border-b border-[#3e3e42] text-right">Duration</th>
                <th className="px-2 py-1 font-normal border-b border-[#3e3e42] text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice().reverse().map((h, i) => (
                <tr key={h.id + '-' + i} className="hover:bg-white/5">
                  <td className="px-2 py-1 border-b border-[#3e3e42]/50 font-mono text-gray-400 whitespace-nowrap">
                    {h.raisedAt}
                  </td>
                  <td className={`px-2 py-1 border-b border-[#3e3e42]/50 font-bold uppercase ${severityColor(h.severity)}`}>
                    {h.severity}
                  </td>
                  <td className="px-2 py-1 border-b border-[#3e3e42]/50 text-gray-300 font-mono">
                    {h.tag || '—'}
                  </td>
                  <td className="px-2 py-1 border-b border-[#3e3e42]/50 text-gray-200">
                    {h.message}
                  </td>
                  <td className="px-2 py-1 border-b border-[#3e3e42]/50 text-right font-mono text-gray-400">
                    {h.duration ? `${h.duration.toFixed(0)}s` : '—'}
                  </td>
                  <td className={`px-2 py-1 border-b border-[#3e3e42]/50 text-right text-[10px] uppercase ${
                    h.clearedAt ? 'text-gray-500' : 'text-[#4ec9b0] animate-pulse'
                  }`}>
                    {h.clearedAt ? 'Cleared' : 'Active'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}