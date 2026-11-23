import React, { useEffect, useRef } from 'react';
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

  const getTag = (severity: SimulationLog['severity']) => {
    switch (severity) {
      case 'success':
        return { label: 'ACK ', cls: 'text-[#10B981]' };
      case 'warn':
        return { label: 'WARN', cls: 'text-[#F59E0B]' };
      case 'error':
        return { label: 'DROP', cls: 'text-[#EF4444]' };
      default:
        return { label: 'INFO', cls: 'text-[#38BDF8]' };
    }
  };

  return (
    <div className="hw-chassis rounded-[2px] flex flex-col flex-1 min-h-[210px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A303C] bg-[#101318]">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
          KERNEL_ROUTER_CONSOLE
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-[9px] text-slate-400 hover:text-slate-100 px-1.5 py-0.5 border border-[#2A303C] rounded-[2px] bg-[#0D0F12] cursor-pointer"
          >
            [CLR]
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[10.5px] leading-relaxed space-y-1 p-2.5 bg-[#090B0E]">
        {logs.length === 0 ? (
          <div className="text-slate-500">
            [00:00] INFO SYS_READY // Align conduits and press [EXECUTE PING].
          </div>
        ) : (
          logs.map((log) => {
            const tag = getTag(log.severity);
            return (
              <div key={log.id} className="flex items-start gap-1.5">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span className={`font-bold shrink-0 ${tag.cls}`}>
                  {tag.label}
                </span>
                <span className="text-slate-300 break-words">{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
