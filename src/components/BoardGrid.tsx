import React from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Server,
  MonitorCheck,
} from 'lucide-react';
import type { Coord, GridTile, PacketConfig, SimulationStep } from '../types/game';

interface BoardGridProps {
  grid: GridTile[][];
  poweredCoords: Set<string>;
  packets: PacketConfig[];
  activeSteps: Record<string, SimulationStep | undefined>;
  failCoord?: Coord | null;
  isSimulating: boolean;
  onRotateTile: (row: number, col: number) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function renderPipeSvg(tile: GridTile, isPowered: boolean, isFail: boolean) {
  if (tile.pipeType === 'NONE') return null;

  const signalColor = isFail
    ? '#EF4444'
    : isPowered
      ? '#38BDF8'
      : '#333B48';

  const sheathColor = '#0A0C0F';

  if (tile.pipeType === 'BRIDGE') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full pointer-events-none">
        {/* Horizontal underpass */}
        <line x1="0" y1="50" x2="100" y2="50" stroke={sheathColor} strokeWidth="22" />
        <line x1="0" y1="50" x2="100" y2="50" stroke={signalColor} strokeWidth="7" strokeDasharray="8 4" />
        {/* Overpass bridge insulator */}
        <rect x="34" y="30" width="32" height="40" fill="#14171C" stroke="#2A303C" strokeWidth="2" />
        {/* Vertical overpass */}
        <line x1="50" y1="0" x2="50" y2="100" stroke={sheathColor} strokeWidth="22" />
        <line x1="50" y1="0" x2="50" y2="100" stroke={signalColor} strokeWidth="8" />
      </svg>
    );
  }

  // Draw base geometry at rotation 0, then rotate smoothly via CSS transform
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full pointer-events-none transition-transform duration-150 ease-out"
      style={{
        transform:
          tile.pipeType === 'CROSS' ? undefined : `rotate(${tile.rotation}deg)`,
      }}
    >
      {tile.pipeType === 'STRAIGHT' && (
        <>
          <line x1="50" y1="0" x2="50" y2="100" stroke={sheathColor} strokeWidth="22" />
          <line x1="50" y1="0" x2="50" y2="100" stroke={signalColor} strokeWidth="8" />
        </>
      )}

      {tile.pipeType === 'ELBOW' && (
        <>
          <path
            d="M 50 0 L 50 50 L 100 50"
            fill="none"
            stroke={sheathColor}
            strokeWidth="22"
            strokeLinejoin="miter"
          />
          <path
            d="M 50 0 L 50 50 L 100 50"
            fill="none"
            stroke={signalColor}
            strokeWidth="8"
            strokeLinejoin="miter"
          />
        </>
      )}

      {tile.pipeType === 'TEE' && (
        <>
          <path
            d="M 0 50 L 100 50 M 50 50 L 50 0"
            fill="none"
            stroke={sheathColor}
            strokeWidth="22"
            strokeLinejoin="miter"
          />
          <path
            d="M 0 50 L 100 50 M 50 50 L 50 0"
            fill="none"
            stroke={signalColor}
            strokeWidth="8"
            strokeLinejoin="miter"
          />
        </>
      )}

      {tile.pipeType === 'CROSS' && (
        <>
          <line x1="50" y1="0" x2="50" y2="100" stroke={sheathColor} strokeWidth="22" />
          <line x1="0" y1="50" x2="100" y2="50" stroke={sheathColor} strokeWidth="22" />
          <line x1="50" y1="0" x2="50" y2="100" stroke={signalColor} strokeWidth="8" />
          <line x1="0" y1="50" x2="100" y2="50" stroke={signalColor} strokeWidth="8" />
        </>
      )}

      {/* Center solder pad */}
      <rect
        x="41"
        y="41"
        width="18"
        height="18"
        fill="#14171C"
        stroke={signalColor}
        strokeWidth="2.5"
      />
      <rect x="47" y="47" width="6" height="6" fill={signalColor} />
    </svg>
  );
}

function getNodeOverlay(tile: GridTile) {
  switch (tile.nodeType) {
    case 'SOURCE':
      return {
        icon: <Server className="w-3.5 h-3.5 text-[#38BDF8]" />,
        border: 'border-[#38BDF8]',
        tag: tile.label ?? 'SRC',
        tagColor: 'text-[#38BDF8]',
      };
    case 'DESTINATION':
      return {
        icon: <MonitorCheck className="w-3.5 h-3.5 text-[#10B981]" />,
        border: 'border-[#10B981]',
        tag: tile.label ?? 'DST',
        tagColor: 'text-[#10B981]',
      };
    case 'DECRYPTOR':
      return {
        icon: <KeyRound className="w-3.5 h-3.5 text-[#F59E0B]" />,
        border: 'border-[#F59E0B]',
        tag: tile.label ?? 'SSL',
        tagColor: 'text-[#F59E0B]',
      };
    case 'FIREWALL':
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />,
        border: 'border-[#F59E0B]',
        tag: tile.label ?? 'FW',
        tagColor: 'text-[#F59E0B]',
      };
    case 'MALWARE':
      return {
        icon: <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />,
        border: 'border-[#EF4444]',
        tag: tile.label ?? 'MAL',
        tagColor: 'text-[#EF4444]',
      };
    default:
      return null;
  }
}

export const BoardGrid: React.FC<BoardGridProps> = ({
  grid,
  poweredCoords,
  packets,
  activeSteps,
  failCoord,
  isSimulating,
  onRotateTile,
}) => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 5;

  return (
    <div className="hw-chassis rounded-[2px] p-2.5 sm:p-3 flex flex-col items-center justify-center relative">
      {/* Corner rackmount screws */}
      <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#2A303C]" />
      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#2A303C]" />
      <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#2A303C]" />
      <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#2A303C]" />

      {/* Subheader silkscreen */}
      <div className="w-full flex items-center justify-between mb-2 px-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
          PATCH_BAY // {rows}x{cols} MATRIX
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          {isSimulating ? (
            <span className="text-[#38BDF8]">● TX_ACTIVE</span>
          ) : (
            <span>○ PLANNING</span>
          )}
        </span>
      </div>

      {/* Silkscreen Columns + Grid */}
      <div className="w-full max-w-[510px] flex flex-col">
        {/* Column Headers (A - H) */}
        <div
          className="grid gap-1 pl-5 mb-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="text-center font-mono text-[10px] text-slate-500 select-none"
            >
              {COL_LABELS[cIdx] ?? cIdx}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Row Headers (0 - 7) */}
          <div
            className="grid gap-1 pr-1.5 w-5 shrink-0"
            style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: rows }).map((_, rIdx) => (
              <div
                key={rIdx}
                className="flex items-center justify-end font-mono text-[10px] text-slate-500 select-none"
              >
                {rIdx}
              </div>
            ))}
          </div>

          {/* Matrix */}
          <div
            className="flex-1 grid gap-1 bg-[#090B0E] p-1.5 border border-[#2A303C] rounded-none"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {grid.map((row) =>
              row.map((tile) => {
                const key = `${tile.row},${tile.col}`;
                const isPowered = poweredCoords.has(key);
                const isFail =
                  failCoord?.row === tile.row && failCoord?.col === tile.col;
                const overlay = getNodeOverlay(tile);
                const canRotate =
                  !isSimulating &&
                  !tile.locked &&
                  tile.pipeType !== 'NONE' &&
                  tile.pipeType !== 'CROSS' &&
                  tile.pipeType !== 'BRIDGE';

                const activePacketsHere = packets.filter((p) => {
                  const step = activeSteps[p.id];
                  return (
                    step &&
                    step.coord.row === tile.row &&
                    step.coord.col === tile.col
                  );
                });

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!canRotate}
                    onClick={() => canRotate && onRotateTile(tile.row, tile.col)}
                    title={`${COL_LABELS[tile.col]}${tile.row} // ${tile.pipeType}${
                      tile.nodeType !== 'NONE' ? ` [${tile.nodeType}]` : ''
                    }${tile.locked ? ' [LOCKED]' : ''}`}
                    className={`relative aspect-square rounded-[2px] flex items-center justify-center overflow-hidden transition-colors duration-100 ${
                      tile.pipeType === 'NONE'
                        ? 'bg-[#0F1216] border border-[#1E232B]'
                        : tile.locked
                          ? 'hw-tile hw-tile-locked'
                          : 'hw-tile'
                    } ${
                      isFail
                        ? 'ring-1 ring-inset ring-[#EF4444]'
                        : overlay
                          ? `ring-1 ring-inset ${overlay.border}`
                          : ''
                    } ${
                      canRotate
                        ? 'cursor-pointer hover:bg-[#222833] active:translate-y-[1px]'
                        : 'cursor-default'
                    }`}
                  >
                    {/* 4-corner mechanical screw marks on locked tiles */}
                    {tile.locked && tile.pipeType !== 'NONE' && (
                      <>
                        <span className="absolute top-0.5 left-0.5 font-mono text-[7px] leading-none text-slate-500 select-none">
                          ×
                        </span>
                        <span className="absolute top-0.5 right-0.5 font-mono text-[7px] leading-none text-slate-500 select-none">
                          ×
                        </span>
                        <span className="absolute bottom-0.5 left-0.5 font-mono text-[7px] leading-none text-slate-500 select-none">
                          ×
                        </span>
                        <span className="absolute bottom-0.5 right-0.5 font-mono text-[7px] leading-none text-slate-500 select-none">
                          ×
                        </span>
                      </>
                    )}

                    {/* Pipe SVG */}
                    {renderPipeSvg(tile, isPowered, isFail)}

                    {/* Node Badge */}
                    {overlay && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="p-1 bg-[#0D0F12] border border-[#2A303C] rounded-[2px]">
                          {overlay.icon}
                        </div>
                        <span
                          className={`mt-0.5 px-1 bg-[#0D0F12] border border-[#2A303C] font-mono text-[8px] font-bold tracking-tight ${overlay.tagColor}`}
                        >
                          {overlay.tag}
                        </span>
                      </div>
                    )}

                    {/* Bridge Silkscreen */}
                    {tile.pipeType === 'BRIDGE' && !overlay && (
                      <span className="absolute bottom-0.5 right-1 font-mono text-[8px] text-slate-400 bg-[#0D0F12] px-0.5 border border-[#2A303C]">
                        BRG
                      </span>
                    )}

                    {/* Active Packet Square Pulse Block */}
                    {activePacketsHere.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        {activePacketsHere.map((pkt) => {
                          const step = activeSteps[pkt.id]!;
                          const blockBg =
                            step.severity === 'error'
                              ? 'bg-[#EF4444] border-white'
                              : step.encrypted
                                ? 'bg-[#F59E0B] border-[#0D0F12]'
                                : pkt.type === 'PRIORITY'
                                  ? 'bg-[#10B981] border-[#0D0F12]'
                                  : 'bg-[#38BDF8] border-[#0D0F12]';

                          return (
                            <div
                              key={pkt.id}
                              className="flex flex-col items-center animate-hw-packet"
                            >
                              <div className="px-1 py-0.5 bg-[#0D0F12] border border-[#2A303C] rounded-[1px] mb-0.5">
                                {step.encrypted ? (
                                  <Lock className="w-2.5 h-2.5 text-[#F59E0B]" />
                                ) : (
                                  <Unlock className="w-2.5 h-2.5 text-[#10B981]" />
                                )}
                              </div>
                              <div
                                className={`w-3.5 h-3.5 border ${blockBg} rounded-[1px]`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
