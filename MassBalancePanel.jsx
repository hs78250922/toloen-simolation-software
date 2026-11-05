// src/components/MassBalancePanel.jsx
import React, { useMemo } from 'react';
import { Scale, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CheckCircle2 } from 'lucide-react';

const DESIGN_INPUTS = [
  { name: 'Fresh BT Feed', source: 'U-500 / U-700', tag: 'BL-P01' },
  { name: 'Fresh Toluene', source: 'U-700', tag: 'BL-P02' },
  { name: 'Make-up Hydrogen', source: 'U-300 / X-3001', tag: 'BL-P03' },
];

const DESIGN_OUTPUTS = [
  { name: 'Benzene Product', dest: 'TK-6002A/B', tag: 'BL-O01' },
  { name: 'C8+ Mixed Xylenes', dest: 'U-400 / T-4003', tag: 'BL-O02' },
  { name: 'LP Purge Gas', dest: 'U-800 / E-8006', tag: 'PURGE-LP' },
];

export default function MassBalancePanel({ liveState, runMode, nodes = [] }) {
  const liveData = useMemo(() => {
    // ۱. تلاش برای خواندن از نودهای PFD (نتیجه Propagate Network)
    const feedNode = nodes.find(n => n.id === 'S-FEED');
    const benzeneNode = nodes.find(n => n.id === 'S-BENZENE');
    const xyleneNode = nodes.find(n => n.id === 'S-XYLENE');

    const isNetworkSolved = feedNode?.data?.computed?.flow_out != null;

    // ۲. مقادیر پایه (اگر شبکه حل نشده بود از liveState یا مقادیر طراحی استفاده می‌شود)
    const feedFlow = feedNode?.data?.computed?.flow_out ?? 79073;
    const makeupFlow = 158;
    const tolueneFlow = 1881;

    const benzeneFlow = benzeneNode?.data?.computed?.flow_out ?? liveState?.benzene_kg_h ?? 54435;
    const xylenesFlow = xyleneNode?.data?.computed?.flow_out ?? liveState?.xylenes_kg_h ?? 25687;
    const purgeFlow = 991;

    const inputs = [
      { ...DESIGN_INPUTS[0], flow: feedFlow },
      { ...DESIGN_INPUTS[1], flow: tolueneFlow },
      { ...DESIGN_INPUTS[2], flow: makeupFlow },
    ];

    const outputs = [
      { ...DESIGN_OUTPUTS[0], flow: benzeneFlow },
      { ...DESIGN_OUTPUTS[1], flow: xylenesFlow },
      { ...DESIGN_OUTPUTS[2], flow: purgeFlow },
    ];

    return {
      inputs,
      outputs,
      totalIn: inputs.reduce((s, x) => s + x.flow, 0),
      totalOut: outputs.reduce((s, x) => s + x.flow, 0),
      isNetworkSolved,
    };
  }, [liveState, nodes]);

  const closure = liveData.totalIn - liveData.totalOut;
  const closurePct = liveData.totalIn > 0 ? (closure / liveData.totalIn) * 100 : 0;
  const closureOk = Math.abs(closurePct) < 1.0;

  return (
    <div className="h-full w-full overflow-y-auto space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-[9px] text-gray-500 uppercase">Total In</div>
          <div className="text-sm font-bold text-[#4ec9b0] font-mono">
            {liveData.totalIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[9px] text-gray-600">kg/h</div>
        </div>
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-[9px] text-gray-500 uppercase">Total Out</div>
          <div className="text-sm font-bold text-[#007acc] font-mono">
            {liveData.totalOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[9px] text-gray-600">kg/h</div>
        </div>
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-[9px] text-gray-500 uppercase">Closure</div>
          <div className={`text-sm font-bold font-mono ${closureOk ? 'text-[#4ec9b0]' : 'text-[#f44747]'}`}>
            {closure.toFixed(0)}
          </div>
          <div className="text-[9px] text-gray-600">kg/h</div>
        </div>
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-[9px] text-gray-500 uppercase">Status</div>
          <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${closureOk ? 'text-[#4ec9b0]' : 'text-[#f44747]'}`}>
            {closureOk ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {closureOk ? 'Balanced' : 'Off'}
          </div>
          <div className="text-[9px] text-gray-600">{closurePct.toFixed(3)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-1 text-[10px] text-[#4ec9b0] uppercase tracking-wider">
            <ArrowDownToLine size={12} /> Boundary Inlets
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-gray-500 text-left border-b border-[#3e3e42]">
                <th className="py-1 font-normal">Stream</th>
                <th className="py-1 font-normal text-right">kg/h</th>
                <th className="py-1 font-normal text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {liveData.inputs.map((row, i) => {
                const pct = (row.flow / liveData.totalIn) * 100;
                return (
                  <tr key={i} className="border-b border-[#3e3e42]/40">
                    <td className="py-1">
                      <div className="text-white">{row.name}</div>
                      <div className="text-[9px] text-gray-600">{row.source}</div>
                    </td>
                    <td className="py-1 text-right font-mono text-[#4ec9b0]">
                      {row.flow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-1 text-right font-mono text-gray-500">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1 text-[10px] text-[#007acc] uppercase tracking-wider">
            <ArrowUpFromLine size={12} /> Boundary Outlets
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-gray-500 text-left border-b border-[#3e3e42]">
                <th className="py-1 font-normal">Stream</th>
                <th className="py-1 font-normal text-right">kg/h</th>
                <th className="py-1 font-normal text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {liveData.outputs.map((row, i) => {
                const pct = (liveData.totalOut > 0 ? (row.flow / liveData.totalOut) * 100 : 0);
                return (
                  <tr key={i} className="border-b border-[#3e3e42]/40">
                    <td className="py-1">
                      <div className="text-white">{row.name}</div>
                      <div className="text-[9px] text-gray-600">{row.dest}</div>
                    </td>
                    <td className="py-1 text-right font-mono text-[#007acc]">
                      {row.flow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-1 text-right font-mono text-gray-500">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-gray-500 uppercase text-[9px]">Benzene Yield</div>
          <div className="text-white font-mono text-sm font-bold">
            {((liveData.outputs[0].flow / liveData.totalIn) * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-gray-600">of total feed</div>
        </div>
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-gray-500 uppercase text-[9px]">Xylenes Yield</div>
          <div className="text-white font-mono text-sm font-bold">
            {((liveData.outputs[1].flow / liveData.totalIn) * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-gray-600">of total feed</div>
        </div>
        <div className="p-2 bg-[#1e1e1e] rounded border border-[#3e3e42]">
          <div className="text-gray-500 uppercase text-[9px]">Conversion</div>
          <div className="text-white font-mono text-sm font-bold">
            {liveState?.conversion_wt?.toFixed(1) ?? '47.5'}%
          </div>
          <div className="text-[9px] text-gray-600">toluene / pass</div>
        </div>
      </div>

      <div className="text-[9px] text-gray-600 border-t border-[#3e3e42] pt-1 leading-relaxed flex items-center justify-between">
        <span>
          <Scale size={10} className="inline mr-1" />
          Data Source: {liveData.isNetworkSolved ? 'PFD Network Solver' : 'Live Simulation / Design'}
        </span>
      </div>
    </div>
  );
}