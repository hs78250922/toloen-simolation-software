// src/components/ReportGenerator.jsx
import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { generateReport, downloadReport } from '../services/pdfReport';

export default function ReportGenerator({
  liveState, runMode, alarmHistory, isSimulating, onClose,
}) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    includePFD: true,
    includeState: true,
    includeEnergy: true,
    includeAlarms: true,
    operator: '',
    notes: '',
  });

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !generating) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, generating]);

  const activeAlarms = alarmHistory.filter(a => !a.clearedAt).length;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const doc = await generateReport({
        liveState, runMode, alarmHistory, isSimulating, options,
      });
      const filename = `unit600_report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
      downloadReport(doc, filename);
      setDone(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const toggleOpt = (key) => setOptions(o => ({ ...o, [key]: !o[key] }));

  const CheckboxRow = ({ label, field, detail }) => (
    <label className="flex items-start gap-2 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={options[field]}
        onChange={() => toggleOpt(field)}
        className="mt-0.5 w-4 h-4 accent-[#007acc] cursor-pointer"
      />
      <div className="flex-1">
        <div className="text-xs text-white font-semibold">{label}</div>
        {detail && <div className="text-[10px] text-gray-500 mt-0.5">{detail}</div>}
      </div>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => !generating && onClose()}
    >
      <div
        className="bg-[#252526] border border-[#3e3e42] rounded-lg shadow-2xl w-[560px] max-w-[94vw] max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[#3e3e42]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-[#007acc]" /> Generate PDF Report
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Compile a snapshot of the current unit status into a printable PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-gray-400 hover:text-white transition-colors p-1 -mr-1 disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Live summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
              <div className="text-[9px] text-gray-500 uppercase">Mode</div>
              <div className={`text-sm font-bold ${runMode === 'EOR' ? 'text-[#f44747]' : 'text-[#4ec9b0]'}`}>
                {runMode}
              </div>
            </div>
            <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
              <div className="text-[9px] text-gray-500 uppercase">Conv.</div>
              <div className="text-sm font-bold text-white font-mono">
                {liveState?.conversion_wt?.toFixed(1) ?? '—'}%
              </div>
            </div>
            <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
              <div className="text-[9px] text-gray-500 uppercase">Active Alarms</div>
              <div className={`text-sm font-bold ${activeAlarms > 0 ? 'text-[#f44747]' : 'text-[#4ec9b0]'}`}>
                {activeAlarms}
              </div>
            </div>
          </div>

          {/* Sections */}
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 px-2">
              Include in Report
            </div>
            <div className="space-y-0.5">
              <CheckboxRow label="Current Process State" field="includeState" detail="Reactor conditions, conversion, product flows" />
              <CheckboxRow label="Energy Balance" field="includeEnergy" detail="Heater duties, recovery, specific energy" />
              <CheckboxRow
                label={`Alarm History (${alarmHistory.length} events)`}
                field="includeAlarms"
                detail={alarmHistory.length === 0 ? 'No alarms recorded' : `Last ${Math.min(alarmHistory.length, 40)} events`}
              />
              <CheckboxRow label="Process Flow Diagram (PFD)" field="includePFD" detail="Screenshot of the current canvas" />
            </div>
          </div>

          {/* Operator */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Operator Name (optional)
            </label>
            <input
              type="text"
              value={options.operator}
              onChange={(e) => setOptions(o => ({ ...o, operator: e.target.value }))}
              placeholder="e.g., J. Smith"
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs focus:outline-none focus:border-[#007acc]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Additional Notes (optional)
            </label>
            <textarea
              value={options.notes}
              onChange={(e) => setOptions(o => ({ ...o, notes: e.target.value }))}
              placeholder="Shift observations, maintenance notes, etc."
              rows={3}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-xs focus:outline-none focus:border-[#007acc] resize-none"
            />
          </div>

          {error && (
            <div className="p-2 bg-[#f44747]/10 border border-[#f44747]/40 rounded text-[11px] text-[#f44747]">
              ⚠ Error: {error}
            </div>
          )}

          {done && (
            <div className="p-2 bg-[#4ec9b0]/10 border border-[#4ec9b0]/40 rounded text-[11px] text-[#4ec9b0] flex items-center gap-2">
              <CheckCircle2 size={14} /> Report downloaded successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#3e3e42] bg-black/20 rounded-b-lg">
          <span className="text-[10px] text-gray-500">
            {options.includePFD ? 'Includes PFD screenshot (may take ~3s)' : 'Text-only (fast)'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={generating}
              className="px-3 py-1.5 text-xs bg-[#3e3e42] text-gray-300 rounded hover:bg-gray-600 transition-colors disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || done}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#007acc] text-white rounded hover:bg-[#0068b0] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <><Loader2 size={12} className="animate-spin" /> Generating...</>
              ) : done ? (
                <><CheckCircle2 size={12} /> Done</>
              ) : (
                <><Download size={12} /> Generate PDF</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}