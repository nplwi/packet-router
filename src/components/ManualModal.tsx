import React from 'react';
import {
  X,
  Server,
  MonitorCheck,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="noc-panel rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#263042] bg-[#0E131B]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00E5FF] rounded-xs" />
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Protocol Manual // NOC Field Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xs border border-[#263042] text-slate-400 hover:text-slate-100 hover:border-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 text-sm text-slate-300">
          {/* 1. Objective */}
          <section className="space-y-1.5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#00E5FF]">
              01. Mission Objective
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              Rotate patch-panel conduits (left-click) to establish valid routes
              from each <strong className="text-[#00E5FF]">SOURCE</strong> server
              to its <strong className="text-[#00E676]">DESTINATION</strong>{' '}
              gateway within the move and time budget. Press{' '}
              <span className="font-mono text-[#00E5FF]">SEND PACKET</span> to
              run live transmission simulation.
            </p>
          </section>

          {/* 2. Conduit Types */}
          <section className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#00E5FF]">
              02. Conduit &amp; Bridge Hardware
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2.5 flex items-center gap-3">
                <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0">
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#00E5FF" strokeWidth="14" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#7DF9FF" strokeWidth="4" />
                </svg>
                <div>
                  <div className="font-mono text-xs font-semibold text-slate-200">
                    STRAIGHT / ELBOW / TEE
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Click to rotate 90° clockwise. Tiles with a{' '}
                    <Lock className="inline w-3 h-3 text-slate-400" /> icon are
                    bolted and cannot rotate.
                  </div>
                </div>
              </div>

              <div className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2.5 flex items-center gap-3">
                <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0">
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#64748B" strokeWidth="14" />
                  <rect x="36" y="34" width="28" height="32" fill="#0B0E14" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#00E5FF" strokeWidth="14" />
                </svg>
                <div>
                  <div className="font-mono text-xs font-semibold text-slate-200">
                    BRIDGE (OVERPASS)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Two isolated tunnels (N&harr;S and E&harr;W). Signals cross
                    without mixing.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Network Nodes */}
          <section className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#00E5FF]">
              03. Network Nodes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2 flex items-start gap-2.5">
                <Server className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-semibold text-[#00E5FF]">SOURCE</span>
                  <p className="text-[11px] text-slate-400">Origin server transmitting packets.</p>
                </div>
              </div>
              <div className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2 flex items-start gap-2.5">
                <MonitorCheck className="w-4 h-4 text-[#00E676] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-semibold text-[#00E676]">DESTINATION</span>
                  <p className="text-[11px] text-slate-400">Target gateway. Rejects encrypted payloads.</p>
                </div>
              </div>
              <div className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-[#FFB000] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-semibold text-[#FFB000]">DECRYPTOR</span>
                  <p className="text-[11px] text-slate-400">SSL/TLS Offloader. Converts ENCRYPTED &rarr; PLAINTEXT.</p>
                </div>
              </div>
              <div className="bg-[#0B0E14] border border-[#263042] rounded-sm p-2 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-semibold text-amber-300">FIREWALL</span>
                  <p className="text-[11px] text-slate-400">Drops encrypted packets. Decrypt before crossing.</p>
                </div>
              </div>
              <div className="bg-[#0B0E14] border border-[#FF3B30]/40 rounded-sm p-2 flex items-start gap-2.5 sm:col-span-2">
                <ShieldAlert className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-semibold text-[#FF3B30]">MALWARE / HONEYPOT</span>
                  <p className="text-[11px] text-slate-400">
                    Compromised node. If any connected branch touches this tile, the payload is intercepted and mission fails.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Packet Rules */}
          <section className="space-y-1.5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#00E5FF]">
              04. Packet Protocols
            </h3>
            <ul className="font-mono text-[11px] space-y-1 text-slate-300 bg-[#0B0E14] border border-[#263042] rounded-sm p-2.5">
              <li>
                <span className="text-[#00E5FF]">STANDARD (TCP/HTTP):</span> Reach DESTINATION without touching MALWARE.
              </li>
              <li>
                <span className="text-[#FFB000]">ENCRYPTED (HTTPS/SSH):</span> Must pass DECRYPTOR before FIREWALL or DESTINATION.
              </li>
              <li>
                <span className="text-[#00E676]">PRIORITY (UDP/ICMP):</span> Must arrive within its maximum hop (TTL) limit.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#263042] bg-[#0E131B] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm bg-[#00E5FF] text-[#0B0E14] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#33ECFF] cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
