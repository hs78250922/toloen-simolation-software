// src/components/FlowsheetCanvas.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState, addEdge, Handle, Position, MarkerType,
} from '@xyflow/react';
import {
  Trash2, RotateCcw, FolderOpen, Search, ChevronDown, ChevronRight, Plus, Play, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import '@xyflow/react/dist/style.css';
import EquipmentEditor from './EquipmentEditor';
import LayoutManager from './LayoutManager';
import StreamEdge from './StreamEdge';
import {
  getLayouts, getActiveLayout, setActiveLayoutId, createLayout, updateLayout, stripLiveData,
} from '../services/layoutStorage';
import { EQUIPMENT_CATALOG, getEquipmentById, ALL_EQUIPMENT } from '../data/equipmentCatalog';
import { simulateFlowsheetNetwork } from '../services/api';

const HysysEquipment = ({ type, data }) => {
  const t = type.toLowerCase();
  const strokeColor = data.status === 'critical' ? '#f44747' : data.status === 'warning' ? '#dcdcaa' : '#9cdcfe';
  const fillColor = '#252526';

  if (t.includes('column') || t.includes('stripper')) {
    return <svg width="50" height="100" viewBox="0 0 50 100" className="mx-auto drop-shadow-lg"><rect x="10" y="10" width="30" height="80" rx="15" fill={fillColor} stroke={strokeColor} strokeWidth="2" />{[20, 30, 40, 50, 60, 70, 80].map(y => <line key={y} x1="12" y1={y} x2="38" y2={y} stroke={strokeColor} strokeWidth="0.5" opacity="0.4" />)}</svg>;
  }
  if (t.includes('reactor')) {
    return <svg width="50" height="90" viewBox="0 0 50 90" className="mx-auto drop-shadow-lg"><rect x="10" y="15" width="30" height="60" rx="15" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><line x1="10" y1="30" x2="40" y2="30" stroke={strokeColor} strokeWidth="1" opacity="0.6" /><line x1="10" y1="60" x2="40" y2="60" stroke={strokeColor} strokeWidth="1" opacity="0.6" /></svg>;
  }
  if (t.includes('exchanger') || t.includes('heater') || t.includes('cooler')) {
    return <svg width="60" height="60" viewBox="0 0 60 60" className="mx-auto drop-shadow-lg"><circle cx="30" cy="30" r="22" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><path d="M 15 30 L 22 20 L 30 40 L 38 20 L 45 30" fill="none" stroke={strokeColor} strokeWidth="2" /></svg>;
  }
  if (t.includes('furnace')) {
    return <svg width="60" height="80" viewBox="0 0 60 80" className="mx-auto drop-shadow-lg"><rect x="5" y="25" width="50" height="45" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><rect x="40" y="5" width="12" height="20" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><path d="M 30 60 Q 20 40 30 35 Q 40 40 30 60" fill="#f44747" opacity="0.8" /></svg>;
  }
  if (t.includes('pump')) {
    return <svg width="50" height="50" viewBox="0 0 50 50" className="mx-auto drop-shadow-lg"><circle cx="25" cy="25" r="16" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><polygon points="18,17 35,25 18,33" fill={strokeColor} /></svg>;
  }
  if (t.includes('compressor')) {
    return <svg width="50" height="50" viewBox="0 0 50 50" className="mx-auto drop-shadow-lg"><polygon points="8,12 42,8 42,42 8,38" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><polygon points="16,18 30,16 30,34 16,32" fill={strokeColor} opacity="0.6" /></svg>;
  }
  if (t.includes('turbine')) {
    return <svg width="50" height="50" viewBox="0 0 50 50" className="mx-auto drop-shadow-lg"><polygon points="8,8 42,12 42,38 8,42" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><line x1="16" y1="16" x2="16" y2="34" stroke={strokeColor} strokeWidth="2" /><line x1="24" y1="14" x2="24" y2="36" stroke={strokeColor} strokeWidth="2" /><line x1="32" y1="13" x2="32" y2="37" stroke={strokeColor} strokeWidth="2" /></svg>;
  }
  if (t.includes('drum') || t.includes('separator')) {
    return <svg width="50" height="70" viewBox="0 0 50 70" className="mx-auto drop-shadow-lg"><rect x="10" y="10" width="30" height="50" rx="15" fill={fillColor} stroke={strokeColor} strokeWidth="2" /><line x1="10" y1="35" x2="40" y2="35" stroke={strokeColor} strokeWidth="1" strokeDasharray="3 3" /></svg>;
  }
  if (t.includes('stream')) {
    return <svg width="30" height="30" viewBox="0 0 30 30" className="mx-auto drop-shadow-lg"><polygon points="5,5 25,15 5,25" fill={fillColor} stroke={strokeColor} strokeWidth="2" /></svg>;
  }
  return <svg width="40" height="40" viewBox="0 0 40 40" className="mx-auto drop-shadow-lg"><rect x="5" y="10" width="30" height="20" fill={fillColor} stroke={strokeColor} strokeWidth="2" /></svg>;
};

const EquipmentNode = ({ data, selected }) => {
  const isMultiOutput = data.simType === 'Column' || data.simType === 'Separator';
  const isStream = data.simType === 'Stream';
  const borderClass = selected ? 'ring-2 ring-[#007acc] shadow-[0_0_15px_rgba(0,122,204,0.5)]' : '';

  return (
    <div className={`relative flex flex-col items-center justify-center transition-all ${borderClass} rounded p-1 hover:bg-[#2d2d2d] bg-[#1e1e1e]`}>
      {isStream ? (
        <>
          <Handle type="target" position={Position.Left} style={{ background: '#4ec9b0', width: 8, height: 8 }} />
          <Handle type="source" position={Position.Right} style={{ background: '#007acc', width: 8, height: 8 }} />
        </>
      ) : isMultiOutput ? (
        <>
          <Handle type="target" position={Position.Left} id="in" style={{ background: '#4ec9b0', width: 10, height: 10 }} />
          <Handle type="target" position={Position.Top} id="in-top" style={{ background: '#4ec9b0', width: 10, height: 10 }} />
          <Handle type="source" position={Position.Top} id="top" style={{ background: '#f44747', width: 10, height: 10, right: 20 }} />
          <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#007acc', width: 10, height: 10, right: 20 }} />
          <Handle type="source" position={Position.Right} id="out" style={{ background: '#007acc', width: 10, height: 10 }} />
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Left} id="in" style={{ background: '#4ec9b0', width: 10, height: 10 }} />
          <Handle type="target" position={Position.Top} id="in-top" style={{ background: '#4ec9b0', width: 10, height: 10 }} />
          <Handle type="source" position={Position.Right} id="out" style={{ background: '#007acc', width: 10, height: 10 }} />
          <Handle type="source" position={Position.Bottom} id="out-bottom" style={{ background: '#007acc', width: 10, height: 10 }} />
        </>
      )}

      <HysysEquipment type={data.type} data={data} />

      <div className="mt-1 text-[10px] font-bold text-white bg-[#1e1e1e]/80 px-1.5 py-0.5 rounded shadow">
        {data.label}
      </div>

      {data.primary && !isStream && (
        <div className={`text-[9px] font-mono mt-0.5 px-1 rounded ${data.status === 'critical' ? 'text-[#f44747]' : data.status === 'warning' ? 'text-[#dcdcaa]' : 'text-[#4ec9b0]'}`}>
          {data.primary}
        </div>
      )}
    </div>
  );
};

const nodeTypes = { equipment: EquipmentNode, stream: EquipmentNode };
const edgeTypes = { stream: StreamEdge };

const BASE_NODES = [
  { id: 'S-FEED', position: { x: 50, y: 250 }, type: 'equipment', data: { label: 'S-FEED', type: 'Stream', simType: 'Stream', design: { composition: { H2: 0, Benzene: 44.84, Toluene: 54.86, Xylenes: 0.2, C9Plus: 0.1 }, T_in: 25, P_in: 2, flow: 80954 } } },
  { id: 'D-6001', position: { x: 150, y: 250 }, type: 'equipment', data: { label: 'D-6001', type: 'Drum', simType: 'Drum' } },
  { id: 'P-6001', position: { x: 270, y: 250 }, type: 'equipment', data: { label: 'P-6001', type: 'Pump', simType: 'Pump' } },
  { id: 'S-MAKEUP-H2', position: { x: 400, y: 50 }, type: 'equipment', data: { label: 'S-MAKEUP-H2', type: 'Stream', simType: 'Stream', design: { composition: { H2: 99.9, Benzene: 0, Toluene: 0, Xylenes: 0, C9Plus: 0.1 }, T_in: 40, P_in: 30, flow: 158 } } },
  { id: 'E-6011', position: { x: 400, y: 400 }, type: 'equipment', data: { label: 'E-6011', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'E-6001', position: { x: 500, y: 250 }, type: 'equipment', data: { label: 'E-6001', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'H-6001', position: { x: 650, y: 250 }, type: 'equipment', data: { label: 'H-6001', type: 'Furnace', simType: 'Furnace' } },
  { id: 'R-6001', position: { x: 800, y: 250 }, type: 'equipment', data: { label: 'R-6001', type: 'Reactor', simType: 'Reactor' } },
  { id: 'AE-6001', position: { x: 950, y: 150 }, type: 'equipment', data: { label: 'AE-6001', type: 'Air Cooler', simType: 'AirCooler' } },
  { id: 'E-6002', position: { x: 950, y: 250 }, type: 'equipment', data: { label: 'E-6002', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'D-6002', position: { x: 1100, y: 250 }, type: 'equipment', data: { label: 'D-6002', type: 'Separator', simType: 'Separator' } },
  { id: 'C-6001', position: { x: 1100, y: 50 }, type: 'equipment', data: { label: 'C-6001', type: 'Compressor', simType: 'Compressor' } },
  { id: 'S-HP-PURGE', position: { x: 1250, y: 50 }, type: 'equipment', data: { label: 'S-HP-PURGE', type: 'Stream', simType: 'Stream', design: { T_in: 43, P_in: 27.2, flow: 500 } } },
  { id: 'E-6003', position: { x: 1250, y: 350 }, type: 'equipment', data: { label: 'E-6003', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'T-6001', position: { x: 1400, y: 250 }, type: 'equipment', data: { label: 'T-6001', type: 'Stripper', simType: 'Column' } },
  { id: 'AE-6002', position: { x: 1550, y: 150 }, type: 'equipment', data: { label: 'AE-6002', type: 'Air Cooler', simType: 'AirCooler' } },
  { id: 'D-6003', position: { x: 1550, y: 50 }, type: 'equipment', data: { label: 'D-6003', type: 'Drum', simType: 'Drum' } },
  { id: 'P-6002', position: { x: 1700, y: 50 }, type: 'equipment', data: { label: 'P-6002', type: 'Pump', simType: 'Pump' } },
  { id: 'S-LP-PURGE', position: { x: 1700, y: -50 }, type: 'equipment', data: { label: 'S-LP-PURGE', type: 'Stream', simType: 'Stream', design: { T_in: 43, P_in: 7.8, flow: 200 } } },
  { id: 'P-6003', position: { x: 1250, y: 500 }, type: 'equipment', data: { label: 'P-6003', type: 'Pump', simType: 'Pump' } },
  { id: 'E-6006', position: { x: 1400, y: 500 }, type: 'equipment', data: { label: 'E-6006', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'E-6007', position: { x: 1550, y: 500 }, type: 'equipment', data: { label: 'E-6007', type: 'Heater', simType: 'Furnace' } },
  { id: 'D-6004', position: { x: 1700, y: 500 }, type: 'equipment', data: { label: 'D-6004', type: 'Clay Treater', simType: 'Filter' } },
  { id: 'T-6002', position: { x: 1900, y: 350 }, type: 'equipment', data: { label: 'T-6002', type: 'Column', simType: 'Column' } },
  { id: 'E-6009', position: { x: 1900, y: 550 }, type: 'equipment', data: { label: 'E-6009', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'AE-6003', position: { x: 2050, y: 200 }, type: 'equipment', data: { label: 'AE-6003', type: 'Air Cooler', simType: 'AirCooler' } },
  { id: 'D-6005', position: { x: 2200, y: 200 }, type: 'equipment', data: { label: 'D-6005', type: 'Drum', simType: 'Drum' } },
  { id: 'P-6004', position: { x: 2350, y: 200 }, type: 'equipment', data: { label: 'P-6004', type: 'Pump', simType: 'Pump' } },
  { id: 'E-6008', position: { x: 2050, y: 350 }, type: 'equipment', data: { label: 'E-6008', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'P-6007', position: { x: 2200, y: 350 }, type: 'equipment', data: { label: 'P-6007', type: 'Pump', simType: 'Pump' } },
  { id: 'S-BENZENE', position: { x: 2350, y: 350 }, type: 'equipment', data: { label: 'S-BENZENE', type: 'Stream', simType: 'Stream' } },
  { id: 'E-6010', position: { x: 2050, y: 550 }, type: 'equipment', data: { label: 'E-6010', type: 'Exchanger', simType: 'Exchanger' } },
  { id: 'T-6003', position: { x: 2200, y: 550 }, type: 'equipment', data: { label: 'T-6003', type: 'Column', simType: 'Column' } },
  { id: 'H-6002', position: { x: 2200, y: 750 }, type: 'equipment', data: { label: 'H-6002', type: 'Furnace', simType: 'Furnace' } },
  { id: 'AE-6004', position: { x: 2350, y: 450 }, type: 'equipment', data: { label: 'AE-6004', type: 'Air Cooler', simType: 'AirCooler' } },
  { id: 'D-6006', position: { x: 2500, y: 450 }, type: 'equipment', data: { label: 'D-6006', type: 'Drum', simType: 'Drum' } },
  { id: 'P-6008', position: { x: 2650, y: 450 }, type: 'equipment', data: { label: 'P-6008', type: 'Pump', simType: 'Pump' } },
  { id: 'P-6009', position: { x: 2350, y: 650 }, type: 'equipment', data: { label: 'P-6009', type: 'Pump', simType: 'Pump' } },
  { id: 'S-XYLENE', position: { x: 2500, y: 650 }, type: 'equipment', data: { label: 'S-XYLENE', type: 'Stream', simType: 'Stream' } },
];

const BASE_EDGES = [
  { id: 'e1', source: 'S-FEED', target: 'D-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e2', source: 'D-6001', target: 'P-6001', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e3', source: 'P-6001', target: 'E-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e-h2-mix', source: 'S-MAKEUP-H2', target: 'E-6001', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e4', source: 'E-6001', target: 'H-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e5', source: 'H-6001', target: 'R-6001', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e6', source: 'R-6001', target: 'E-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e7', source: 'E-6001', target: 'AE-6001', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e8', source: 'AE-6001', target: 'E-6002', animated: true, style: { stroke: '#00bfff' } }, { id: 'e9', source: 'E-6002', target: 'D-6002', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e10', source: 'D-6002', target: 'C-6001', sourceHandle: 'top', animated: true, style: { stroke: '#00bfff' } }, { id: 'e11', source: 'C-6001', target: 'R-6001', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e-hp-purge', source: 'D-6002', target: 'S-HP-PURGE', sourceHandle: 'top', animated: true, style: { stroke: '#00bfff' } }, { id: 'e12', source: 'D-6002', target: 'E-6003', sourceHandle: 'bottom', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e13', source: 'E-6003', target: 'T-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e14', source: 'T-6001', target: 'AE-6002', sourceHandle: 'top', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e15', source: 'AE-6002', target: 'D-6003', animated: true, style: { stroke: '#00bfff' } }, { id: 'e16', source: 'D-6003', target: 'P-6002', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e17', source: 'P-6002', target: 'T-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e-lp-purge', source: 'D-6003', target: 'S-LP-PURGE', sourceHandle: 'top', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e18', source: 'T-6001', target: 'P-6003', sourceHandle: 'bottom', animated: true, style: { stroke: '#00bfff' } }, { id: 'e19', source: 'P-6003', target: 'E-6006', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e20', source: 'E-6006', target: 'E-6007', animated: true, style: { stroke: '#00bfff' } }, { id: 'e21', source: 'E-6007', target: 'D-6004', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e22', source: 'D-6004', target: 'T-6002', animated: true, style: { stroke: '#00bfff' } }, { id: 'e23', source: 'T-6002', target: 'AE-6003', sourceHandle: 'top', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e24', source: 'AE-6003', target: 'D-6005', animated: true, style: { stroke: '#00bfff' } }, { id: 'e25', source: 'D-6005', target: 'P-6004', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e26', source: 'P-6004', target: 'T-6002', animated: true, style: { stroke: '#00bfff' } }, { id: 'e27', source: 'T-6002', target: 'E-6008', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e28', source: 'E-6008', target: 'P-6007', animated: true, style: { stroke: '#00bfff' } }, { id: 'e29', source: 'P-6007', target: 'S-BENZENE', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e30', source: 'T-6002', target: 'E-6009', sourceHandle: 'bottom', animated: true, style: { stroke: '#00bfff' } }, { id: 'e31', source: 'E-6009', target: 'T-6002', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e32', source: 'E-6009', target: 'E-6010', animated: true, style: { stroke: '#00bfff' } }, { id: 'e33', source: 'E-6010', target: 'T-6003', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e34', source: 'T-6003', target: 'H-6002', sourceHandle: 'bottom', animated: true, style: { stroke: '#00bfff' } }, { id: 'e35', source: 'H-6002', target: 'T-6003', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e36', source: 'T-6003', target: 'AE-6004', sourceHandle: 'top', animated: true, style: { stroke: '#00bfff' } }, { id: 'e37', source: 'AE-6004', target: 'D-6006', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e38', source: 'D-6006', target: 'P-6008', animated: true, style: { stroke: '#00bfff' } }, { id: 'e39', source: 'P-6008', target: 'E-6011', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e40', source: 'E-6011', target: 'D-6001', animated: true, style: { stroke: '#00bfff' } }, { id: 'e41', source: 'T-6003', target: 'P-6009', sourceHandle: 'bottom', animated: true, style: { stroke: '#00bfff' } },
  { id: 'e42', source: 'P-6009', target: 'S-XYLENE', animated: true, style: { stroke: '#00bfff' } },
];

function buildLiveProps(liveState, runMode) {
  if (!liveState) {
    return {
      'H-6001': { primary: runMode === 'EOR' ? '480°C' : '375°C', status: runMode === 'EOR' ? 'warning' : 'normal' },
      'R-6001': { primary: runMode === 'EOR' ? '480°C' : '390°C', status: runMode === 'EOR' ? 'critical' : 'normal' },
      'E-6001': { primary: '46.6 MW', status: 'normal' },
      'T-6002': { primary: '143°C', status: 'normal' },
      'T-6003': { primary: '247°C', status: 'normal' },
    };
  }
  const rxOutlet = liveState.reactor_outlet_temp_C;
  const conv = liveState.conversion_wt;
  const isCritical = rxOutlet >= 478 || conv < 45;
  const isWarning = !isCritical && (rxOutlet >= 470 || conv < 46);
  return {
    'H-6001': { primary: `${liveState.reactor_inlet_temp_C.toFixed(1)}°C`, status: isCritical ? 'critical' : isWarning ? 'warning' : 'normal' },
    'R-6001': { primary: `${rxOutlet.toFixed(1)}°C`, status: isCritical ? 'critical' : isWarning ? 'warning' : 'normal' },
    'E-6001': { primary: `${liveState['E-6001_MW']?.toFixed(1)} MW`, status: 'normal' },
    'T-6002': { primary: '143°C', status: 'normal' },
    'T-6003': { primary: '247°C', status: 'normal' },
  };
}

function nodeFromCatalog(catalogItem, position) {
  const d = catalogItem.design || {};
  return {
    id: catalogItem.id,
    type: 'equipment',
    position,
    data: {
      label: catalogItem.id,
      type: catalogItem.type,
      simType: catalogItem.simType,
      service: catalogItem.service,
      specs: catalogItem.specs,
      design: d,
      params: catalogItem.params || {},
      primary: d.T_out != null ? `${d.T_out.toFixed(1)}°C` : '—',
      status: 'normal',
    },
  };
}

export default function FlowsheetCanvas({ onNodeClick, runMode = 'SOR', liveState, onDataChange }) {
  const liveProps = useMemo(() => buildLiveProps(liveState, runMode), [liveState, runMode]);

  const initialLayout = useMemo(() => {
    const store = getLayouts();
    let active = getActiveLayout();
    if (!active) active = createLayout('Unit 600 Real PFD', BASE_NODES, BASE_EDGES, { activate: true });
    return active;
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    (initialLayout.nodes.length > 0 ? initialLayout.nodes : BASE_NODES).map(n => ({ ...n, data: { ...n.data, ...(liveProps[n.id] || {}) } }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges.length > 0 ? initialLayout.edges : BASE_EDGES);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState(initialLayout.id);
  const [currentLayoutName, setCurrentLayoutName] = useState(initialLayout.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [propagating, setPropagating] = useState(false);
  const [propagationLog, setPropagationLog] = useState([]);
  const [showToast, setShowToast] = useState(null);

  const isLoadingRef = useRef(false);
  const lastSaveRef = useRef('');
  const editingNode = nodes.find(n => n.id === editingNodeId) || null;
  const existingIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);

  useEffect(() => { if (onDataChange) onDataChange(nodes, edges); }, [nodes, edges, onDataChange]);
  useEffect(() => { setNodes(prev => prev.map(n => { const live = liveProps[n.id]; if (!live) return n; return { ...n, data: { ...n.data, ...live } }; })); }, [liveProps, setNodes]);

  useEffect(() => {
    if (isLoadingRef.current || !currentLayoutId) return;
    const stripped = stripLiveData(nodes);
    const serialized = JSON.stringify({ n: stripped, e: edges });
    if (serialized === lastSaveRef.current) return;
    lastSaveRef.current = serialized;
    updateLayout(currentLayoutId, nodes, edges);
  }, [nodes, edges, currentLayoutId]);

  const handleSwitchLayout = useCallback((layoutId) => {
    const store = getLayouts();
    const layout = store.layouts.find(l => l.id === layoutId);
    if (!layout) return;
    isLoadingRef.current = true;
    setNodes((layout.nodes || []).map(n => ({ ...n, data: { ...n.data, ...(liveProps[n.id] || {}) } })));
    setEdges(layout.edges || []);
    setCurrentLayoutId(layoutId);
    setCurrentLayoutName(layout.name);
    setActiveLayoutId(layoutId);
    setSelectedNodeId(null);
    setEditingNodeId(null);
    lastSaveRef.current = '';
    setTimeout(() => { isLoadingRef.current = false; }, 200);
  }, [liveProps, setNodes, setEdges]);

  useEffect(() => {
    if (showLayoutManager) return;
    const store = getLayouts();
    const l = store.layouts.find(l => l.id === currentLayoutId);
    if (l) setCurrentLayoutName(l.name);
  }, [showLayoutManager, currentLayoutId]);

  // ⭐️ اصلاح شده: ذخیره duty_mw از پایتون
  const handlePropagate = useCallback(async () => {
    if (nodes.length === 0) return;
    setPropagating(true);
    setShowToast(null);

    try {
      const response = await simulateFlowsheetNetwork(nodes, edges);
      const pythonResults = response.results;

      setNodes(prev => prev.map(n => {
        const r = pythonResults[n.id];
        if (!r) return n;
        
        const T = r.temperature_c;
        const P = r.pressure_barg;
        
        let computedFlow = 0;
        if (r.flows_kg_h) {
          computedFlow = Object.values(r.flows_kg_h).reduce((sum, val) => sum + (val || 0), 0);
        }
        const F = computedFlow > 0 ? computedFlow : (n.data.computed?.flow_out || n.data.design?.flow || 0);
        
        let status = 'normal';
        if (T > 478) status = 'critical'; else if (T > 470) status = 'warning';

        const computedData = { 
          T_in: n.data.computed?.T_in ?? 25,
          P_in: n.data.computed?.P_in ?? 1, 
          T_out: T, 
          P_out: P, 
          flow_in: F, 
          flow_out: F, 
          isLive: false,
          duty_mw: r.duty_mw ?? 0, // ⭐️ ذخیره Duty برگشتی از پایتون
          composition: r.flows_kg_h 
        };

        if (r.top) {
          const topF = Object.values(r.top.flows_kg_h).reduce((sum, val) => sum + (val || 0), 0);
          computedData.top = {
            T_out: r.top.temperature_c,
            P_out: r.top.pressure_barg,
            flow_out: topF,
            composition: r.top.flows_kg_h
          };
        }

        return {
          ...n,
          data: {
            ...n.data,
            computed: computedData,
            primary: `${T.toFixed(1)}°C`,
            secondary: `${P.toFixed(2)} barg`,
            status: status,
          },
        };
      }));

      setPropagationLog(response.log || []);
      setShowToast({ 
        type: response.converged ? 'success' : 'warning', 
        message: response.converged 
          ? `✓ Network Converged (${response.iterations} iter, Python Engine)` 
          : '⚠ Max iterations reached in Python' 
      });
      setTimeout(() => setShowToast(null), 4000);

    } catch (err) {
      setShowToast({ type: 'error', message: `Python Solver Error: ${err.message}` });
    } finally {
      setPropagating(false);
    }
  }, [nodes, edges]);

  const handleAddFromCatalog = useCallback((catalogItem) => {
    if (existingIds.has(catalogItem.id)) { alert(`"${catalogItem.id}" is already on the canvas.`); return; }
    setNodes(prev => [...prev, nodeFromCatalog(catalogItem, { x: 200 + Math.random() * 400, y: 100 + Math.random() * 300 })]);
  }, [existingIds, setNodes]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    if (editingNodeId === selectedNodeId) setEditingNodeId(null);
  }, [selectedNodeId, editingNodeId, setNodes, setEdges]);

  const handleResetLayout = useCallback(() => {
    if (!window.confirm('Reset the current layout to default? Unsaved changes will be lost.')) return;
    isLoadingRef.current = true;
    setNodes(BASE_NODES.map(n => ({ ...n, data: { ...n.data, ...(liveProps[n.id] || {}) } })));
    setEdges(BASE_EDGES);
    setSelectedNodeId(null);
    setEditingNodeId(null);
    setTimeout(() => { isLoadingRef.current = false; lastSaveRef.current = ''; }, 200);
  }, [liveProps, setNodes, setEdges]);

  const onConnect = useCallback((connection) => {
    setEdges(eds => addEdge({ ...connection, animated: true, style: { stroke: '#00bfff', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00bfff' } }, eds));
  }, [setEdges]);

  const handleNodeClickInternal = useCallback((event, node) => { setSelectedNodeId(node.id); onNodeClick?.(node); }, [onNodeClick]);
  const handleNodeDoubleClick = useCallback((event, node) => { setEditingNodeId(node.id); }, []);
  const handlePaneClick = useCallback(() => setSelectedNodeId(null), []);

  const handleEditSave = useCallback((nodeId, newData) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: newData } : n));
    setEditingNodeId(null);
    setTimeout(() => handlePropagate(), 200);
  }, [setNodes, handlePropagate]);

  const handleEditDelete = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const toggleCategory = (name) => {
    setExpandedCats(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ALL_EQUIPMENT.filter(e => e.id.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.service.toLowerCase().includes(q)).slice(0, 12);
  }, [searchQuery]);

  const displayEdges = useMemo(() => {
    return edges.map(e => {
      const src = nodes.find(n => n.id === e.source);
      let stream = null;
      if (src?.data?.computed) {
        const handle = e.sourceHandle || 'out';
        if (handle === 'top' && src.data.computed.top) {
          stream = { T: src.data.computed.top.T_out, P: src.data.computed.top.P_out, F: src.data.computed.top.flow_out };
        } else if (handle === 'bottom' && src.data.computed.bottom) {
          stream = { T: src.data.computed.bottom.T_out, P: src.data.computed.bottom.P_out, F: src.data.computed.bottom.flow_out };
        } else {
          stream = { T: src.data.computed.T_out, P: src.data.computed.P_out, F: src.data.computed.flow_out ?? src.data.computed.flow_in };
        }
      }
      return { ...e, type: 'stream', data: { ...e.data, stream } };
    });
  }, [edges, nodes]);

  return (
    <div id="pfd-canvas" className="w-full h-full relative bg-[#1e1e1e]">
      <div className="absolute top-2 left-2 z-10 flex flex-col bg-[#252526]/95 backdrop-blur rounded border border-[#3e3e42] shadow-2xl w-64 max-h-[70vh] overflow-hidden">
        <button onClick={() => setShowLayoutManager(true)} className="flex items-center gap-2 px-2 py-2 text-[10px] text-gray-200 hover:bg-[#007acc]/20 border-b border-[#3e3e42] flex-shrink-0">
          <FolderOpen size={12} className="text-[#007acc]" /><span className="truncate flex-1 text-left font-semibold">{currentLayoutName}</span>
        </button>
        <div className="relative border-b border-[#3e3e42] flex-shrink-0">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search equipment..." className="w-full pl-7 pr-2 py-1.5 bg-transparent text-[11px] text-white placeholder-gray-500 focus:outline-none" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() ? (
            <div className="p-1">
              {searchResults.length === 0 ? <div className="text-[10px] text-gray-500 text-center py-4">No matches</div> : searchResults.map(item => {
                const exists = existingIds.has(item.id);
                return (
                  <button key={item.id} onClick={() => !exists && handleAddFromCatalog(item)} disabled={exists} className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-[10px] rounded hover:bg-[#007acc]/20 ${exists ? 'opacity-30 cursor-not-allowed' : ''}`}>
                    <Plus size={10} className="text-[#007acc] flex-shrink-0" /><div className="flex-1 min-w-0"><div className="text-white font-semibold truncate">{item.id}</div><div className="text-gray-500 truncate">{item.service}</div></div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-1">
              {EQUIPMENT_CATALOG.map(cat => {
                const isExpanded = expandedCats.has(cat.category);
                return (
                  <div key={cat.category} className="mb-1">
                    <button onClick={() => toggleCategory(cat.category)} className="w-full flex items-center gap-1 px-1 py-1 text-[10px] text-gray-400 hover:text-white">
                      {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }}></span>
                      <span className="font-semibold uppercase tracking-wider">{cat.category}</span>
                      <span className="ml-auto text-[9px] text-gray-600">{cat.items.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-3 space-y-0.5">
                        {cat.items.map(item => {
                          const exists = existingIds.has(item.id);
                          return (
                            <button key={item.id} onClick={() => !exists && handleAddFromCatalog(item)} disabled={exists} className={`w-full flex items-center gap-1 px-1.5 py-1 text-left text-[10px] rounded hover:bg-[#007acc]/20 ${exists ? 'opacity-30 cursor-not-allowed' : ''}`}>
                              <Plus size={9} className="text-[#007acc] flex-shrink-0" /><span className="font-mono text-white">{item.id}</span><span className="text-gray-500 truncate">{item.service}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-[#3e3e42] p-1 space-y-0.5 bg-[#252526] flex-shrink-0">
          <button onClick={handleDeleteSelected} disabled={!selectedNodeId} className="w-full flex items-center gap-2 px-2 py-1 text-[10px] text-[#f44747] hover:bg-[#f44747]/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={12} /> <span>Delete Selected</span></button>
          <button onClick={handleResetLayout} className="w-full flex items-center gap-2 px-2 py-1 text-[10px] text-gray-400 hover:bg-white/5 rounded"><RotateCcw size={12} /> <span>Reset to Default</span></button>
          <button onClick={handlePropagate} disabled={propagating || nodes.length === 0} className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-[10px] bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/40 rounded hover:bg-[#007acc]/30 disabled:opacity-40 disabled:cursor-not-allowed font-semibold mt-1">
            {propagating ? <><Loader2 size={11} className="animate-spin" /> Solving in Python...</> : <><Play size={11} /> Propagate Network</>}
          </button>
        </div>
        {propagationLog.length > 0 && (
          <div className="border-t border-[#3e3e42] px-2 py-1 max-h-20 overflow-y-auto bg-black/20 flex-shrink-0">
            {propagationLog.map((line, i) => (<div key={i} className={`text-[9px] font-mono ${line.startsWith('✓') ? 'text-[#4ec9b0]' : line.startsWith('⚠') ? 'text-[#dcdcaa]' : 'text-gray-500'}`}>{line}</div>))}
          </div>
        )}
      </div>

      {showToast && (
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded border shadow-lg animate-fade-in text-xs ${showToast.type === 'success' ? 'bg-[#4ec9b0]/15 border-[#4ec9b0]/50 text-[#4ec9b0]' : showToast.type === 'warning' ? 'bg-[#dcdcaa]/15 border-[#dcdcaa]/50 text-[#dcdcaa]' : 'bg-[#f44747]/15 border-[#f44747]/50 text-[#f44747]'}`}>
          {showToast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}<span className="font-semibold">{showToast.message}</span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-10 text-[9px] text-gray-500 bg-black/60 backdrop-blur px-2 py-1 rounded border border-[#3e3e42]/50">
        💡 <span className="text-[#007acc]">Double-click</span> to edit & simulate &nbsp;|&nbsp; Connect with handles &nbsp;|&nbsp; <span className="text-[#4ec9b0]">Propagate</span> to solve network
      </div>

      <ReactFlow 
        nodes={nodes} 
        edges={displayEdges} 
        edgeTypes={edgeTypes} 
        onNodesChange={onNodesChange} 
        onEdgesChange={onEdgesChange} 
        onConnect={onConnect} 
        onNodeClick={handleNodeClickInternal} 
        onNodeDoubleClick={handleNodeDoubleClick} 
        onPaneClick={handlePaneClick} 
        nodeTypes={nodeTypes} 
        fitView 
        deleteKeyCode={['Delete', 'Backspace']} 
        className="bg-[#1e1e1e]" 
        connectionLineStyle={{ stroke: '#00bfff', strokeWidth: 2, strokeDasharray: '5 5' }} 
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2d2d2d" gap={20} />
        <Controls className="bg-[#252526] border-[#3e3e42] fill-white" />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data?.status === 'critical') return '#f44747';
            if (n.data?.status === 'warning') return '#dcdcaa';
            return '#3e3e42';
          }} 
          maskColor="rgba(0,0,0,0.5)" 
          pannable 
          zoomable 
          className="!bg-[#1e1e1e] !border-[#3e3e42] rounded-md shadow-lg" 
          style={{ width: 150, height: 100 }} 
        />
      </ReactFlow>

      {editingNode && <EquipmentEditor node={editingNode} onSave={handleEditSave} onDelete={handleEditDelete} onClose={() => setEditingNodeId(null)} />}
      {showLayoutManager && <LayoutManager currentNodes={nodes} currentEdges={edges} onSwitch={handleSwitchLayout} onClose={() => setShowLayoutManager(false)} />}
    </div>
  );
}