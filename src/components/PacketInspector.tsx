import React from 'react';
import { Lock, Unlock, Zap, Shield, ArrowRight } from 'lucide-react';
import type { PacketConfig, PacketSimulationResult } from '../types/game';

interface PacketInspectorProps {
  packets: PacketConfig[];
  results?: PacketSimulationResult[];
}

export const PacketInspector: React.FC<PacketInspectorProps> = ({
  packets,
  results,
}) => {
  return (
    <div className="noc-panel rounded-md p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between border-b border-[#263042] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-xs bg-[#00E5FF]" />
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
            Packet Inspector
          </h2>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          QUEUE: {packets.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {packets.map((pkt) => {
          const res = results?.find((r) => r.packetId === pkt.id);
          const statusBadge = res
            ? res.success
              ? { text: '200_ACK', cls: 'text-[#00E676] border-[#00E676]/40 bg-[#00E676]/10' }
              : { text: res.errorCode ?? 'ERR_DROP', cls: 'text-[#FF3B30] border-[#FF3B30]/40 bg-[#FF3B30]/10' }
            : { text: 'READY', cls: 'text-slate-300 border-[#263042] bg-[#0B0E14]' };

          const typeColor =
            pkt.type === 'ENCRYPTED'
              ? 'text-[#FFB000]'
              : pkt.type === 'PRIORITY'
                ? 'text-[#00E676]'
                : 'text-[#00E5FF]';

          return (
            <div
              key={pkt.id}
              className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold ${typeColor}`}>
                    {pkt.id}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {pkt.protocol}
                  </span>
                </div>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 border rounded-xs ${statusBadge.cls}`}
                >
                  {statusBadge.text}
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                <span className="flex items-center gap-1">
                  ({pkt.sourceCoord.col},{pkt.sourceCoord.row})
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  ({pkt.destCoord.col},{pkt.destCoord.row})
                </span>
                <span className="text-slate-400">{pkt.label}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1C2433]">
                {pkt.encrypted ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#FFB000] bg-[#FFB000]/10 border border-[#FFB000]/30 px-1.5 py-0.5 rounded-xs">
                    <Lock className="w-2.5 h-2.5" />
                    REQ: DECRYPTOR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-[#131822] border border-[#263042] px-1.5 py-0.5 rounded-xs">
                    <Unlock className="w-2.5 h-2.5" />
                    PLAINTEXT
                  </span>
                )}

                {pkt.maxHops !== undefined && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-1.5 py-0.5 rounded-xs">
                    <Zap className="w-2.5 h-2.5" />
                    TTL &le; {pkt.maxHops} HOPS
                  </span>
                )}

                {pkt.authTag && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-1.5 py-0.5 rounded-xs">
                    <Shield className="w-2.5 h-2.5" />
                    AUTH_TAG
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
