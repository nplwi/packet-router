import React from 'react';
import { Lock, ShieldAlert, ShieldCheck, KeyRound, Server, MonitorCheck } from 'lucide-react';
import type { Coord, GridTile, PacketConfig, SimulationStep } from '../types/game';
import { getTilePorts } from '../engine/routerEngine';

interface BoardGridProps {
  grid: GridTile[][];
  poweredCoords: Set<string>;
  packets: PacketConfig[];
  activeSteps: Record<string, SimulationStep | undefined>;
  failCoord?: Coord | null;
  isSimulating: boolean;
  onRotateTile: (row: number, col: number) => void;
}

const PORT_COORDS = {
  N: { x: 50, y: 0 },
  E: { x: 100, y: 50 },
  S: { x: 50, y: 100 },
  W: { x: 0, y: 50 },
};

function renderPipeSvg(tile: GridTile, isPowered: boolean, isFail: boolean) {
  if (tile.pipeType === 'NONE') return null;

  const strokeColor = isFail
    ? '#FF3B30'
    : isPowered
      ? '#00E5FF'
      : '#475569';

  const coreColor = isFail
    ? '#FF3B30'
    : isPowered
      ? '#7DF9FF'
      : '#64748B';

  if (tile.pipeType === 'BRIDGE') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full pointer-events-none">
        {/* Horizontal underpass */}
        <line x1="0" y1="50" x2="100" y2="50" stroke={strokeColor} strokeWidth="14" strokeLinecap="butt" />
        <line x1="0" y1="50" x2="100" y2="50" stroke={coreColor} strokeWidth="4" strokeDasharray="6 4" />
        {/* Gap mask for overpass */}
        <rect x="36" y="34" width="28" height="32" fill="#0F141D" />
        {/* Vertical overpass */}
        <line x1="50" y1="0" x2="50" y2="100" stroke={strokeColor} strokeWidth="14" strokeLinecap="butt" />
        <line x1="50" y1="0" x2="50" y2="100" stroke={coreColor} strokeWidth="4" />
        <rect x="38" y="38" width="24" height="24" fill="none" stroke="#263042" strokeWidth="2" />
      </svg>
    );
  }

  const ports = getTilePorts(tile);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full pointer-events-none">
      {ports.map((dir) => {
        const end = PORT_COORDS[dir];
        return (
          <g key={dir}>
            <line
              x1="50"
              y1="50"
              x2={end.x}
              y2={end.y}
              stroke={strokeColor}
              strokeWidth="14"
              strokeLinecap="square"
            />
            <line
              x1="50"
              y1="50"
              x2={end.x}
              y2={end.y}
              stroke={coreColor}
              strokeWidth="3"
            />
          </g>
        );
      })}
      {/* Center junction */}
      <rect
        x="40"
        y="40"
        width="20"
        height="20"
        rx="2"
        fill="#131822"
        stroke={strokeColor}
        strokeWidth="3"
      />
      <circle cx="50" cy="50" r="3.5" fill={coreColor} />
    </svg>
  );
}

function getNodeBadge(tile: GridTile) {
  switch (tile.nodeType) {
    case 'SOURCE':
      return {
        icon: <Server className="w-4 h-4 text-[#00E5FF]" />,
        border: 'border-[#00E5FF]/70',
        bg: 'bg-[#00E5FF]/10',
        tag: tile.label ?? 'SRC',
        tagColor: 'text-[#00E5FF]',
      };
    case 'DESTINATION':
      return {
        icon: <MonitorCheck className="w-4 h-4 text-[#00E676]" />,
        border: 'border-[#00E676]/70',
        bg: 'bg-[#00E676]/10',
        tag: tile.label ?? 'DST',
        tagColor: 'text-[#00E676]',
      };
    case 'DECRYPTOR':
      return {
        icon: <KeyRound className="w-4 h-4 text-[#FFB000]" />,
        border: 'border-[#FFB000]/70',
        bg: 'bg-[#FFB000]/10',
        tag: tile.label ?? 'SSL',
        tagColor: 'text-[#FFB000]',
      };
    case 'FIREWALL':
      return {
        icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
        border: 'border-amber-400/70',
        bg: 'bg-amber-400/10',
        tag: tile.label ?? 'FW',
        tagColor: 'text-amber-300',
      };
    case 'MALWARE':
      return {
        icon: <ShieldAlert className="w-4 h-4 text-[#FF3B30]" />,
        border: 'border-[#FF3B30]/80',
        bg: 'bg-[#FF3B30]/15',
        tag: tile.label ?? 'MAL',
        tagColor: 'text-[#FF3B30]',
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
  const cols = grid[0]?.length ?? 5;

  return (
    <div className="noc-panel rounded-md p-3 sm:p-4 flex flex-col items-center justify-center">
      {/* Coordinate Header */}
      <div className="w-full flex items-center justify-between mb-2.5 px-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
          PATCH_MATRIX // {grid.length}x{cols}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {isSimulating ? 'STATE: SIMULATING_TX' : 'STATE: PLANNING_MODE'}
        </span>
      </div>

      {/* Grid Container */}
      <div
        className="grid gap-1.5 bg-[#090C11] p-2.5 border border-[#263042] rounded-sm w-full max-w-[520px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row) =>
          row.map((tile) => {
            const key = `${tile.row},${tile.col}`;
            const isPowered = poweredCoords.has(key);
            const isFail =
              failCoord?.row === tile.row && failCoord?.col === tile.col;
            const badge = getNodeBadge(tile);
            const canRotate =
              !isSimulating &&
              !tile.locked &&
              tile.pipeType !== 'NONE' &&
              tile.pipeType !== 'CROSS' &&
              tile.pipeType !== 'BRIDGE';

            // Check if any active packet is currently on this tile
            const activePacketsHere = packets.filter((p) => {
              const step = activeSteps[p.id];
              return step && step.coord.row === tile.row && step.coord.col === tile.col;
            });

            return (
              <button
                key={key}
                type="button"
                disabled={!canRotate}
                onClick={() => canRotate && onRotateTile(tile.row, tile.col)}
                title={`(${tile.col},${tile.row}) ${tile.pipeType}${tile.nodeType !== 'NONE' ? ` [${tile.nodeType}]` : ''}${tile.locked ? ' LOCKED' : ''}`}
                className={`relative aspect-square rounded-sm border transition-colors duration-150 flex items-center justify-center overflow-hidden ${
                  isFail
                    ? 'border-[#FF3B30] bg-[#FF3B30]/15'
                    : badge
                      ? `${badge.border} ${badge.bg}`
                      : tile.pipeType === 'NONE'
                        ? 'border-[#1B2230] bg-[#0D1118]'
                        : isPowered
                          ? 'border-[#00E5FF]/40 bg-[#111926]'
                          : 'border-[#263042] bg-[#131822]'
                } ${
                  canRotate
                    ? 'cursor-pointer hover:border-[#00E5FF]/80 hover:bg-[#182130] active:scale-[0.97]'
                    : 'cursor-default'
                }`}
              >
                {/* Coordinate watermark */}
                <span className="absolute top-0.5 left-1 font-mono text-[9px] text-slate-600 select-none">
                  {tile.col},{tile.row}
                </span>

                {/* Locked indicator */}
                {tile.locked && tile.pipeType !== 'NONE' && (
                  <Lock className="absolute top-1 right-1 w-2.5 h-2.5 text-slate-500" />
                )}

                {/* Pipe SVG */}
                {renderPipeSvg(tile, isPowered, isFail)}

                {/* Special Node Overlay */}
                {badge && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="p-1 rounded-sm bg-[#0B0E14]/90 border border-[#263042] shadow-sm">
                      {badge.icon}
                    </div>
                    <span
                      className={`mt-0.5 px-1 bg-[#0B0E14]/90 font-mono text-[9px] font-semibold tracking-tight ${badge.tagColor}`}
                    >
                      {badge.tag}
                    </span>
                  </div>
                )}

                {/* Bridge Label */}
                {tile.pipeType === 'BRIDGE' && !badge && (
                  <span className="absolute bottom-0.5 right-1 font-mono text-[8px] text-slate-400 bg-[#0B0E14]/80 px-0.5">
                    BRG
                  </span>
                )}

                {/* Active Packet Dot(s) */}
                {activePacketsHere.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {activePacketsHere.map((pkt) => {
                      const step = activeSteps[pkt.id]!;
                      const color =
                        step.severity === 'error'
                          ? 'bg-[#FF3B30] ring-[#FF3B30]/40'
                          : step.encrypted
                            ? 'bg-[#FFB000] ring-[#FFB000]/40'
                            : pkt.type === 'PRIORITY'
                              ? 'bg-[#00E676] ring-[#00E676]/40'
                              : 'bg-[#00E5FF] ring-[#00E5FF]/40';
                      return (
                        <div
                          key={pkt.id}
                          className={`w-4 h-4 rounded-full ring-4 ${color} animate-packet flex items-center justify-center`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0B0E14]" />
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
  );
};
