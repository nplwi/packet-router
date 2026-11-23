import React from 'react';
import { Star } from 'lucide-react';
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
    <div className="hw-chassis rounded-[2px] px-2 py-1.5 flex flex-wrap items-center gap-1">
      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mr-1">
        NODES:
      </span>
      {levels.map((lvl, idx) => {
        const isCurrent = idx === currentIndex;
        const lvlProg = progress[lvl.id];
        const numLabel = String(idx + 1).padStart(2, '0');

        return (
          <button
            key={lvl.id}
            type="button"
            onClick={() => onSelectLevel(idx)}
            title={`${lvl.code} - ${lvl.name}`}
            className={`px-2 py-1 rounded-[2px] border font-mono text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${
              isCurrent
                ? 'border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] font-bold'
                : lvlProg?.completed
                  ? 'border-[#10B981]/60 bg-[#0D0F12] text-[#10B981] hover:border-[#10B981]'
                  : 'border-[#2A303C] bg-[#0D0F12] text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            <span>{numLabel}</span>
            {lvlProg?.completed && (
              <span className="inline-flex items-center">
                {Array.from({ length: lvlProg.stars }).map((_, sIdx) => (
                  <Star
                    key={sIdx}
                    className="w-2.5 h-2.5 fill-[#F59E0B] text-[#F59E0B]"
                  />
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
