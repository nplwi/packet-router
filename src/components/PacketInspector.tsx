import React from 'react';
import type { PacketConfig, PacketSimulationResult } from '../types/game';

interface PacketInspectorProps {
  packets: PacketConfig[];
  results?: PacketSimulationResult[];
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function formatCoord(row: number, col: number) {
  return `${COL_LABELS[col] ?? col}${row}`;
}

export const PacketInspector: React.FC<PacketInspectorProps> = ({
  packets,
  results,
}) => {
  return (
    <div className="hw-chassis rounded-[2px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A303C] bg-[#101318]">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
          PACKET_HEADER_TABLE
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          STREAMS: {packets.length}
        </span>
      </div>

      {/* Wireshark-style Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-[10px]">
          <thead>
            <tr className="border-b border-[#2A303C] bg-[#0D0F12] text-slate-500">
              <th className="py-1.5 px-2 font-semibold">PKT_ID</th>
              <th className="py-1.5 px-2 font-semibold">PROTO</th>
              <th className="py-1.5 px-2 font-semibold">STATE</th>
              <th className="py-1.5 px-2 font-semibold">MAX_HOP</th>
              <th className="py-1.5 px-2 font-semibold">TARGET</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222833]">
            {packets.map((pkt) => {
              const res = results?.find((r) => r.packetId === pkt.id);

              const stateBadge = res
                ? res.success
                  ? {
                      label: '200_ACK',
                      cls: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]',
                    }
                  : {
                      label: 'DROP',
                      cls: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]',
                    }
                : pkt.encrypted
                  ? {
                      label: 'TLS_ENC',
                      cls: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]',
                    }
                  : {
                      label: 'PLAIN',
                      cls: 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]',
                    };

              return (
                <tr key={pkt.id} className="hover:bg-[#1B2028]/60">
                  <td className="py-2 px-2 font-bold text-slate-200">
                    {pkt.id}
                  </td>
                  <td className="py-2 px-2 text-slate-400">{pkt.protocol}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 border rounded-[1px] text-[9px] font-bold ${stateBadge.cls}`}
                    >
                      {stateBadge.label}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-slate-300">
                    {pkt.maxHops !== undefined ? `${pkt.maxHops}` : 'INF'}
                  </td>
                  <td className="py-2 px-2 text-slate-300">
                    {formatCoord(pkt.sourceCoord.row, pkt.sourceCoord.col)}&rarr;
                    {formatCoord(pkt.destCoord.row, pkt.destCoord.col)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rule Legend */}
      <div className="px-3 py-1.5 border-t border-[#2A303C] bg-[#0D0F12] flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-slate-500">
        <span>TLS_ENC = REQ DECRYPTOR</span>
        <span>MAX_HOP = PRIORITY TTL</span>
      </div>
    </div>
  );
};
