import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Activity, Settings, Database, Flame, Gauge, FileText, Table } from 'lucide-react';
import FlowsheetCanvas from './components/FlowsheetCanvas';
import InspectorPanel from './components/InspectorPanel';
import TreePanel from './components/TreePanel';
import AnalysisPanel from './components/AnalysisPanel';
import AlarmBanner from './components/AlarmBanner';
import ReportGenerator from './components/ReportGenerator';
import { startSimulation, pauseSimulation, resetSimulation, setMode, checkHealth, getState } from './services/api';
import { exportToExcel } from './services/excelExporter';

const LIMITS = {
  reactorTempWarning: 470,
  reactorTempCritical: 480,
  conversionWarning: 46,
  conversionCritical: 45,
  h2fMin: 4.0,
  catalystWarning: 0.6,
  catalystCritical: 0.4,
};

function App() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [runMode, setRunMode] = useState('SOR');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [alarms, setAlarms] = useState([]);
  const [latestState, setLatestState] = useState(null);
  const [alarmHistory, setAlarmHistory] = useState([]);
  const [showReport, setShowReport] = useState(false);
  
  // وضعیت داده‌های PFD برای پنل تحلیل و اکسل
  const [canvasData, setCanvasData] = useState({ nodes: [], edges: [] });

  // ✅ استفاده از useCallback برای جلوگیری از رندر مجدد بی‌پایان
  const handleCanvasDataChange = useCallback((nodes, edges) => {
    setCanvasData({ nodes, edges });
  }, []);

  // ============ بررسی وضعیت بک‌اند ============
  useEffect(() => {
    const check = async () => {
      const ok = await checkHealth();
      setBackendStatus(ok ? 'connected' : 'offline');
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  // ============ Polling وضعیت شبیه‌سازی ============
  useEffect(() => {
    if (backendStatus !== 'connected') return;
    const poll = async () => {
      const state = await getState();
      if (!state) return;
      setLatestState(state);
      setAlarms(deriveAlarms(state, backendStatus));
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [backendStatus]);

  // ============ مدیریت تاریخچه هشدارها ============
  useEffect(() => {
    setAlarmHistory(prev => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      const currentIds = new Set(alarms.map(a => a.id));

      return prev.map(item => {
        if (!item.clearedAt && !currentIds.has(item.id)) {
          return {
            ...item,
            clearedAt: timeStr,
            duration: (now.getTime() - item.raisedAtMs) / 1000,
          };
        }
        return item;
      }).concat(
        alarms
          .filter(a => !prev.some(h => h.id === a.id && !h.clearedAt))
          .map(a => ({
            id: a.id,
            severity: a.severity,
            message: a.message,
            tag: a.tag,
            raisedAt: timeStr,
            raisedAtMs: now.getTime(),
            clearedAt: null,
            duration: 0,
          }))
      );
    });
  }, [alarms]);

  // ============ تشخیص آلارم‌ها ============
  const deriveAlarms = (s, backendStatus) => {
    const list = [];
    const now = Date.now();
    if (backendStatus === 'offline') {
      list.push({ id: 'backend-off', severity: 'info', message: 'Backend server is offline — data unavailable', tag: 'SYS-01', ts: now });
    }
    if (s.reactor_outlet_temp_C >= LIMITS.reactorTempCritical) {
      list.push({ id: 'rx-temp-crit', severity: 'critical', message: `Reactor outlet at ${s.reactor_outlet_temp_C.toFixed(1)}°C — catalyst regeneration required`, tag: 'TSHH-60008', ts: now });
    } else if (s.reactor_inlet_temp_C >= LIMITS.reactorTempWarning) {
      list.push({ id: 'rx-temp-warn', severity: 'warning', message: `Reactor inlet at ${s.reactor_inlet_temp_C.toFixed(1)}°C — approaching design limit`, tag: 'TIC-60006', ts: now });
    }
    if (s.conversion_wt < LIMITS.conversionCritical) {
      list.push({ id: 'conv-crit', severity: 'critical', message: `Toluene conversion dropped to ${s.conversion_wt.toFixed(1)} wt% — below minimum`, tag: 'AI-60004', ts: now });
    } else if (s.conversion_wt < LIMITS.conversionWarning) {
      list.push({ id: 'conv-warn', severity: 'warning', message: `Toluene conversion at ${s.conversion_wt.toFixed(1)} wt% — below target 47.5%`, tag: 'AI-60004', ts: now });
    }
    if (s.h2f_ratio < LIMITS.h2fMin) {
      list.push({ id: 'h2f-low', severity: 'warning', message: `H2/F ratio at ${s.h2f_ratio.toFixed(2)} — below 4.0 minimum`, tag: 'FIC-60006', ts: now });
    }
    if (s.catalyst_activity < LIMITS.catalystCritical) {
      list.push({ id: 'cat-crit', severity: 'critical', message: `Catalyst activity at ${(s.catalyst_activity * 100).toFixed(0)}% — end of run`, tag: 'R-6001', ts: now });
    } else if (s.catalyst_activity < LIMITS.catalystWarning) {
      list.push({ id: 'cat-warn', severity: 'warning', message: `Catalyst activity at ${(s.catalyst_activity * 100).toFixed(0)}% — degraded`, tag: 'R-6001', ts: now });
    }
    return list;
  };

  const dismissAlarm = (id) => setAlarms(prev => prev.filter(a => a.id !== id));
  const clearAlarmHistory = () => setAlarmHistory([]);

  // ============ Handlers ============
  const handleRunPause = async () => {
    if (isSimulating) { await pauseSimulation(); setIsSimulating(false); }
    else { await startSimulation(); setIsSimulating(true); }
  };

  const handleModeChange = async (m) => { setRunMode(m); await setMode(m); };

  const handleReset = async () => {
    await resetSimulation();
    setIsSimulating(false);
    setRunMode('SOR');
    setAlarms([]);
    setLatestState(null);
    setAlarmHistory([]);
  };

  const handleExportExcel = () => {
    exportToExcel({
      nodes: canvasData.nodes,
      edges: canvasData.edges,
      liveState: latestState,
      runMode: runMode,
      alarmHistory: alarmHistory,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-gray-300 font-sans select-none">
      
      {/* ======================= Top Bar ======================= */}
      <header className="flex items-center justify-between h-12 px-4 bg-[#252526] border-b border-[#3e3e42] flex-shrink-0">
        <div className="flex items-center gap-4">
          <Database className="text-[#007acc]" size={20} />
          <h1 className="text-sm font-bold tracking-wider text-white">UNIT 600 - DISPROPORTIONATION STUDIO</h1>
          <span className="text-[10px] px-2 py-0.5 bg-[#007acc]/20 text-[#007acc] rounded border border-[#007acc]/40">v1.7</span>
          <span className={`text-[10px] flex items-center gap-1 ${backendStatus === 'connected' ? 'text-[#4ec9b0]' : 'text-[#f44747]'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-[#4ec9b0]' : 'bg-[#f44747]'}`}></span>
            Backend: {backendStatus}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1e1e1e] border border-[#3e3e42] rounded overflow-hidden">
            <button onClick={() => handleModeChange('SOR')} className={`px-3 py-1 text-xs transition-colors ${runMode === 'SOR' ? 'bg-[#4ec9b0]/20 text-[#4ec9b0]' : 'text-gray-400 hover:bg-white/5'}`}>SOR</button>
            <button onClick={() => handleModeChange('EOR')} className={`px-3 py-1 text-xs transition-colors ${runMode === 'EOR' ? 'bg-[#f44747]/20 text-[#f44747]' : 'text-gray-400 hover:bg-white/5'}`}>EOR</button>
          </div>
          
          <button onClick={handleRunPause} className={`flex items-center gap-1 px-3 py-1 text-xs rounded border ${isSimulating ? 'bg-[#f44747]/10 text-[#f44747] border-[#f44747]/40' : 'bg-[#4ec9b0]/10 text-[#4ec9b0] border-[#4ec9b0]/40'}`}>
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
            {isSimulating ? 'Pause' : 'Run Simulation'}
          </button>
          
          <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1 text-xs bg-[#3e3e42] rounded hover:bg-gray-600">
            <RotateCcw size={14} /> Reset
          </button>
          
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[#007acc]/10 text-[#007acc] border border-[#007acc]/40 rounded hover:bg-[#007acc]/20 transition-colors"
            title="Generate PDF report"
          >
            <FileText size={14} /> Report
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[#4ec9b0]/10 text-[#4ec9b0] border border-[#4ec9b0]/40 rounded hover:bg-[#4ec9b0]/20 transition-colors"
            title="Export all data to Excel"
          >
            <Table size={14} /> Excel
          </button>

          <div className="ml-4 flex items-center gap-2 px-2 py-1 text-xs bg-black/50 rounded border border-[#3e3e42]">
            <Flame size={12} className="text-[#f44747]" />
            <span>Thermo: Peng-Robinson</span>
          </div>
        </div>
      </header>

      {/* ======================= Alarm Banner ======================= */}
      <AlarmBanner alarms={alarms} onDismiss={dismissAlarm} />

      {/* ======================= Main Content ======================= */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Project Tree */}
        <aside className="w-64 bg-[#252526] border-r border-[#3e3e42] flex flex-col">
          <div className="p-2 text-xs font-semibold bg-black/20 border-b border-[#3e3e42] flex items-center gap-2">
            <Settings size={14} /> Project Explorer
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <TreePanel />
          </div>
          <div className="p-2 text-[10px] text-gray-500 border-t border-[#3e3e42] flex items-center gap-2">
            <Gauge size={12} className={runMode === 'EOR' ? 'text-[#f44747]' : 'text-[#4ec9b0]'} />
            <span>Mode: {runMode} | Conv: {latestState?.conversion_wt?.toFixed(1) ?? '--'}%</span>
          </div>
        </aside>

        {/* Center - PFD Canvas */}
        <main className="flex-1 relative bg-[#111111]">
          <FlowsheetCanvas 
            onNodeClick={(node) => setSelectedNode(node)} 
            runMode={runMode} 
            liveState={latestState} 
            onDataChange={handleCanvasDataChange}
          />
          <div className="absolute top-2 right-2 flex gap-2 pointer-events-none">
            <div className="bg-black/70 backdrop-blur px-2 py-1 rounded border border-[#3e3e42] text-[10px] text-gray-300">Feed: 80,954 kg/h</div>
            <div className="bg-black/70 backdrop-blur px-2 py-1 rounded border border-[#3e3e42] text-[10px] text-[#4ec9b0]">
              Benzene: {latestState?.benzene_kg_h?.toFixed(0).toLocaleString() ?? '54,435'} kg/h
            </div>
          </div>
        </main>

        {/* Right Sidebar - Property Inspector */}
        <aside className="w-80 bg-[#252526] border-l border-[#3e3e42] flex flex-col">
          <div className="p-2 text-xs font-semibold bg-black/20 border-b border-[#3e3e42] flex items-center gap-2">
            <Activity size={14} /> Property Inspector
          </div>
          <div className="flex-1 overflow-y-auto">
            <InspectorPanel selectedNode={selectedNode} runMode={runMode} />
          </div>
        </aside>
      </div>

      {/* ======================= Bottom Panel ======================= */}
      <footer className="h-64 bg-[#252526] border-t border-[#3e3e42] flex flex-col flex-shrink-0">
        <AnalysisPanel
          isSimulating={isSimulating}
          runMode={runMode}
          liveState={latestState}
          alarmHistory={alarmHistory}
          onClearHistory={clearAlarmHistory}
          nodes={canvasData.nodes}
          edges={canvasData.edges}
        />
      </footer>

      {/* ======================= Modals ======================= */}
      {showReport && (
        <ReportGenerator
          liveState={latestState}
          runMode={runMode}
          alarmHistory={alarmHistory}
          isSimulating={isSimulating}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

export default App;