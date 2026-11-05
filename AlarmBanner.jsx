// src/components/AlarmBanner.jsx
import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';

/**
 * Alarm Banner - shows active alarms based on current process state.
 * Priority: Critical > Warning > Info
 */
export default function AlarmBanner({ alarms, onDismiss }) {
  if (!alarms || alarms.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[#4ec9b0]/5 border-b border-[#4ec9b0]/20 text-[11px] text-[#4ec9b0]">
        <CheckCircle2 size={14} />
        <span>All Systems Normal — No active alarms</span>
        <span className="ml-auto text-[10px] text-gray-500">
          Alarm scan every 2s
        </span>
      </div>
    );
  }

  // Sort by severity
  const sorted = [...alarms].sort((a, b) => {
    const p = { critical: 0, warning: 1, info: 2 };
    return p[a.severity] - p[b.severity];
  });

  const primary = sorted[0];
  const bg = {
    critical: 'bg-[#f44747]/15 border-[#f44747]/50 text-[#f44747]',
    warning:  'bg-[#dcdcaa]/15 border-[#dcdcaa]/50 text-[#dcdcaa]',
    info:     'bg-[#007acc]/15 border-[#007acc]/50 text-[#007acc]',
  }[primary.severity];

  const Icon = primary.severity === 'critical' ? AlertTriangle
             : primary.severity === 'warning'  ? AlertCircle
             : CheckCircle2;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 border-b text-xs ${bg} animate-pulse-slow`}>
      <Icon size={16} className="flex-shrink-0" />
      <span className="font-bold uppercase tracking-wider">
        {primary.severity}
      </span>
      <span className="text-white/90">{primary.message}</span>
      {alarms.length > 1 && (
        <span className="ml-2 text-[10px] opacity-70">
          (+{alarms.length - 1} more)
        </span>
      )}
      <span className="ml-auto text-[10px] opacity-60 font-mono">
        {primary.tag || ''}
      </span>
      {onDismiss && (
        <button 
          onClick={() => onDismiss(primary.id)} 
          className="ml-2 hover:opacity-100 opacity-60 transition-opacity"
          title="Acknowledge"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}