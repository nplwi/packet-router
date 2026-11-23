import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import type { SimulationLog } from '../types/game';

interface TerminalLogProps {
  logs: SimulationLog[];
  onClear?: () => void;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs, onClear }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getSeverityColor = (severity: SimulationLog['severity']) => {
    switch (severity) {
      case 'success':
        return 'text-[#00E676]';
      case 'warn':
        return 'text-[#FFB000]';
      case 'error':
        return 'text-[#FF3B30]';
      default:
        return 'text-[#00E5FF]';
    }
  };

  return (
    <div className="noc-panel rounded-md p-3 flex flex-col h-56 sm:h-64">
      <div className="flex items-center justify-between border-b border-[#263042] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
            NOC Trace Log
          </h2>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 border border-[#263042] rounded-xs bg-[#0B0E14] cursor-pointer"
          >
            CLR
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 pr-1 bg-[#080B10] border border-[#1E2636] rounded-sm p-2">
        {logs.length === 0 ? (
          <div className="text-slate-500">
            [00:00] SYS_IDLE // Configure patch routes and press SEND PACKET...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
              <span className={getSeverityColor(log.severity)}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
