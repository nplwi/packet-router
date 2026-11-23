import React from 'react';
import {
  X,
  Server,
  MonitorCheck,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="hw-chassis rounded-[2px] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2A303C] bg-[#101318]">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-100">
            PROTOCOL_MANUAL // NOC HARDWARE GUIDE
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[2px] border border-[#2A303C] text-slate-400 hover:text-slate-100 hover:border-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs text-slate-300">
          <section className="space-y-1">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#38BDF8]">
              01. PATCH BAY OPERATION
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Left-click any unlocked conduit module to rotate it 90° clockwise.
              Tiles marked with four corner screws (<span className="font-mono">×</span>)
              are mechanically bolted (<span className="font-mono">locked: true</span>)
              and cannot be rotated. Press <span className="font-mono text-[#38BDF8]">[EXECUTE PING]</span> to
              dispatch all packet streams.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#38BDF8]">
              02. TEE / CROSS BRANCHING &amp; MALWARE TRAP RULE
            </h3>
            <div className="bg-[#0D0F12] border border-[#EF4444]/60 rounded-[2px] p-2.5 space-y-1">
              <div className="font-mono text-[11px] font-bold text-[#EF4444]">
                ERR_MALWARE_TRAP_TRIGGERED
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Signal propagation on <span className="font-mono">TEE</span> and{' '}
                <span className="font-mono">CROSS</span> junctions splits across
                all connected ports. If <strong>any</strong> connected branch
                reaches a <span className="font-mono text-[#EF4444]">MALWARE</span>{' '}
                honeypot, the entire transmission is compromised and fails—even
                if another branch reaches <span className="font-mono text-[#10B981]">DESTINATION</span>.
              </p>
            </div>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#38BDF8]">
              03. HARDWARE NODES
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-[#0D0F12] border border-[#2A303C] rounded-[2px] p-2 flex items-start gap-2">
                <Server className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-[#38BDF8]">SOURCE</div>
                  <div className="text-[11px] text-slate-400">Packet origin server.</div>
                </div>
              </div>
              <div className="bg-[#0D0F12] border border-[#2A303C] rounded-[2px] p-2 flex items-start gap-2">
                <MonitorCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-[#10B981]">DESTINATION</div>
                  <div className="text-[11px] text-slate-400">Target gateway. Rejects encrypted payloads.</div>
                </div>
              </div>
              <div className="bg-[#0D0F12] border border-[#2A303C] rounded-[2px] p-2 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-[#F59E0B]">DECRYPTOR</div>
                  <div className="text-[11px] text-slate-400">SSL/TLS offloader. Converts TLS_ENC &rarr; PLAIN.</div>
                </div>
              </div>
              <div className="bg-[#0D0F12] border border-[#2A303C] rounded-[2px] p-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-[#F59E0B]">FIREWALL</div>
                  <div className="text-[11px] text-slate-400">Drops encrypted packets. Decrypt before crossing.</div>
                </div>
              </div>
              <div className="bg-[#0D0F12] border border-[#EF4444]/50 rounded-[2px] p-2 flex items-start gap-2 sm:col-span-2">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-[#EF4444]">MALWARE HONEYPOT</div>
                  <div className="text-[11px] text-slate-400">Dead-zone. Isolate all conduit branches away from this node.</div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#38BDF8]">
              04. PACKET PROTOCOLS &amp; MAX_HOP (TTL)
            </h3>
            <ul className="font-mono text-[10.5px] space-y-1 bg-[#0D0F12] border border-[#2A303C] rounded-[2px] p-2.5">
              <li>
                <span className="text-[#38BDF8]">STANDARD:</span> Deliver to target without hitting MALWARE.
              </li>
              <li>
                <span className="text-[#F59E0B]">ENCRYPTED:</span> Must pass DECRYPTOR before FIREWALL or DESTINATION.
              </li>
              <li>
                <span className="text-[#10B981]">PRIORITY:</span> Must arrive within strict MAX_HOP (TTL) budget or triggers ERR_TTL_EXCEEDED.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#2A303C] bg-[#101318] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[2px] bg-[#38BDF8] text-[#0D0F12] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#60CCF9] cursor-pointer"
          >
            [CLOSE MANUAL]
          </button>
        </div>
      </div>
    </div>
  );
};
