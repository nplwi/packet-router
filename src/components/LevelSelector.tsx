import React from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import type { LevelConfig, LevelProgress } from '../types/game';

interface LevelSelectorProps {
  levels: LevelConfig[];
  currentIndex: number;
  progress: Record<string, LevelProgress>;
  onSelectLevel: (index: number) => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  levels,
  currentIndex,
  progress,
  onSelectLevel,
}) => {
  return (
    <div className="noc-panel rounded-md p-2 flex flex-wrap items-center gap-1.5">
      {levels.map((lvl, idx) => {
        const isCurrent = idx === currentIndex;
        const lvlProg = progress[lvl.id];

        return (
          <button
            key={lvl.id}
            type="button"
            onClick={() => onSelectLevel(idx)}
            className={`px-2.5 py-1.5 rounded-sm border font-mono text-xs transition-colors flex items-center gap-2 cursor-pointer ${
              isCurrent
                ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]'
                : lvlProg?.completed
                  ? 'border-[#00E676]/40 bg-[#0B0E14] text-slate-200 hover:border-[#00E676]/70'
                  : 'border-[#263042] bg-[#0B0E14] text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            <span className="font-semibold">0{idx + 1}</span>
            <span className="hidden md:inline text-[11px] opacity-85">
              {lvl.code.replace(/^0\d_/, '')}
            </span>
            {lvlProg?.completed && (
              <span className="inline-flex items-center gap-0.5 text-[#00E676]">
                <CheckCircle2 className="w-3 h-3" />
                <span className="inline-flex items-center">
                  {Array.from({ length: lvlProg.stars }).map((_, sIdx) => (
                    <Star
                      key={sIdx}
                      className="w-2.5 h-2.5 fill-[#FFB000] text-[#FFB000]"
                    />
                  ))}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
