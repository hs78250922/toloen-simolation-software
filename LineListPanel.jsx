// src/components/LineListPanel.jsx
import React, { useState, useMemo } from 'react';
import { ListFilter, Search } from 'lucide-react';

const LINE_LIST_DATA = [
  { id: 'AR-60501', service: 'AR', size: '6', from: 'TK-6001', to: 'P-6031A/B', P_oper: '0', T_oper: '47', P_design: '3.5', T_design: '65', flow: '103' },
  { id: 'BZ-60501', service: 'BZ', size: '10', from: 'TK-6002A', to: 'P-6032A/B', P_oper: '0', T_oper: '47', P_design: '3.5', T_design: '65', flow: '216100' },
  { id: 'BZ-60550', service: 'BZ', size: '6', from: 'PROCESS(P-127)', to: 'TK-6002A', P_oper: '3.5', T_oper: '47', P_design: '13.6', T_design: '60', flow: '54435' },
  { id: 'CWR-60501', service: 'CWR', size: '0.75', from: 'P-6032A', to: 'CWR-91509', P_oper: '6.1', T_oper: '47', P_design: '11.5', T_design: '100', flow: '-' },
];

export default function LineListPanel({ nodes }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');

  const filteredLines = useMemo(() => {
    return LINE_LIST_DATA.filter(line => {
      const matchesSearch = line.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            line.from.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesService = serviceFilter === 'ALL' || line.service === serviceFilter;
      return matchesSearch && matchesService;
    });
  }, [searchQuery, serviceFilter]);

  return (
    <div className="h-full w-full flex flex-col space-y-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-[#007acc] uppercase tracking-wider">
          <ListFilter size={14} /> Piping Line List (Unit 600)
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search line..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 pr-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded text-[10px] text-white focus:outline-none focus:border-[#007acc] w-48" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto border border-[#3e3e42] rounded">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead className="bg-[#252526] sticky top-0 z-10">
            <tr className="text-gray-400 border-b border-[#3e3e42]">
              <th className="p-2 font-normal">Line No.</th>
              <th className="p-2 font-normal text-center">Service</th>
              <th className="p-2 font-normal text-center">Size (NPS)</th>
              <th className="p-2 font-normal">From</th>
              <th className="p-2 font-normal">To</th>
              <th className="p-2 font-normal text-right">P_Oper</th>
              <th className="p-2 font-normal text-right">T_Oper</th>
              <th className="p-2 font-normal text-right">Flow (kg/h)</th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map((line, i) => (
              <tr key={i} className="border-b border-[#3e3e42]/50 hover:bg-white/5 transition-colors">
                <td className="p-2 font-mono font-bold text-[#4ec9b0]">{line.id}</td>
                <td className="p-2 text-center text-gray-300">{line.service}</td>
                <td className="p-2 text-center text-gray-400">{line.size}"</td>
                <td className="p-2 text-white">{line.from}</td>
                <td className="p-2 text-white">{line.to}</td>
                <td className="p-2 text-right text-[#dcdcaa]">{line.P_oper}</td>
                <td className="p-2 text-right text-[#f44747]">{line.T_oper}</td>
                <td className="p-2 text-right font-mono text-gray-300">{line.flow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}