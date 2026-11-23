import { useEffect, useMemo, useRef, useState } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import levelsData from './data/levels.json';
import type {
  Coord,
  GridTile,
  LevelConfig,
  LevelProgress,
  LevelSimulationResult,
  SimulationLog,
  SimulationStep,
} from './types/game';
import {
  buildGrid,
  calculateStars,
  getPoweredCoords,
  nextRotation,
  simulateLevel,
} from './engine/routerEngine';
import { BoardGrid } from './components/BoardGrid';
import { PacketInspector } from './components/PacketInspector';
import { TerminalLog } from './components/TerminalLog';
import { LevelSelector } from './components/LevelSelector';
import { ManualModal } from './components/ManualModal';

const STORAGE_KEY = 'packet-router-progress-v1';
const LEVELS = levelsData as LevelConfig[];

function loadProgress(): Record<string, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LevelProgress>;
  } catch {
    return {};
  }
}

export function App() {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = LEVELS[currentLevelIdx];

  const [grid, setGrid] = useState<GridTile[][]>(() =>
    buildGrid(currentLevel.rows, currentLevel.cols, currentLevel.tiles)
  );
  const [movesLeft, setMovesLeft] = useState(currentLevel.maxMoves);
  const [timeTenths, setTimeTenths] = useState(currentLevel.timeLimit * 10);
  const [isPaused, setIsPaused] = useState(false);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
  const [activeSteps, setActiveSteps] = useState<Record<string, SimulationStep | undefined>>({});
  const [simResult, setSimResult] = useState<LevelSimulationResult | null>(null);
  const [failCoord, setFailCoord] = useState<Coord | null>(null);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [missionOutcome, setMissionOutcome] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');

  const [progress, setProgress] = useState<Record<string, LevelProgress>>(loadProgress);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const simTimerRef = useRef<number | null>(null);

  const clearSimTimer = () => {
    if (simTimerRef.current !== null) {
      window.clearTimeout(simTimerRef.current);
      simTimerRef.current = null;
    }
  };

  const resetLevelState = (level: LevelConfig) => {
    clearSimTimer();
    setGrid(buildGrid(level.rows, level.cols, level.tiles));
    setMovesLeft(level.maxMoves);
    setTimeTenths(level.timeLimit * 10);
    setIsPaused(false);
    setIsSimulating(false);
    setActiveSteps({});
    setSimResult(null);
    setFailCoord(null);
    setLogs([]);
    setMissionOutcome('IDLE');
  };

  const handleSelectLevel = (idx: number) => {
    setCurrentLevelIdx(idx);
    resetLevelState(LEVELS[idx]);
  };

  // 100ms precision countdown timer during planning phase
  useEffect(() => {
    if (isPaused || isSimulating || missionOutcome === 'SUCCESS' || timeTenths <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setTimeTenths((prev) => {
        if (prev <= 1) {
          setMissionOutcome('FAILED');
          setLogs((old) => [
            ...old,
            {
              id: `timeout-${Date.now()}`,
              timestamp: '00:00',
              packetId: 'SYS',
              message: 'ERR_LINK_TIMEOUT // Countdown expired. Reset board.',
              severity: 'error',
            },
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [isPaused, isSimulating, missionOutcome, timeTenths]);

  useEffect(() => {
    return () => clearSimTimer();
  }, []);

  const poweredCoords = useMemo(() => {
    const sources = currentLevel.packets.map((p) => p.sourceCoord);
    return getPoweredCoords(grid, sources);
  }, [grid, currentLevel.packets]);

  const handleRotateTile = (row: number, col: number) => {
    if (isSimulating || missionOutcome === 'SUCCESS' || timeTenths <= 0) return;
    if (movesLeft <= 0) {
      setLogs((prev) => [
        ...prev,
        {
          id: `nomoves-${Date.now()}`,
          timestamp: 'SYS',
          packetId: 'SYS',
          message: 'MOVE_BUDGET_DEPLETED // Press [EXECUTE PING] or [RESET BOARD].',
          severity: 'warn',
        },
      ]);
      return;
    }

    setGrid((prev) =>
      prev.map((r, rIdx) =>
        rIdx === row
          ? r.map((tile, cIdx) =>
              cIdx === col
                ? { ...tile, rotation: nextRotation(tile.rotation) }
                : tile
            )
          : r
      )
    );
    setMovesLeft((m) => m - 1);
    setFailCoord(null);
    if (missionOutcome === 'FAILED') {
      setMissionOutcome('IDLE');
    }
  };

  const handleExecute = () => {
    if (isSimulating || timeTenths <= 0) return;

    clearSimTimer();
    setIsSimulating(true);
    setFailCoord(null);
    setMissionOutcome('IDLE');
    setActiveSteps({});

    const result = simulateLevel(grid, currentLevel);
    setSimResult(result);

    const maxSteps = Math.max(
      ...result.packetResults.map((r) => r.steps.length),
      0
    );

    const bootLog: SimulationLog = {
      id: `boot-${Date.now()}`,
      timestamp: '00:00',
      packetId: 'SYS',
      message: `PING_EXEC // Dispatching ${currentLevel.packets.length} stream(s) @ ${simSpeed}x...`,
      severity: 'info',
    };
    setLogs([bootLog]);

    let stepIndex = 0;
    const stepDelay = simSpeed === 2 ? 150 : 300;

    const advanceStep = () => {
      if (stepIndex >= maxSteps) {
        setIsSimulating(false);
        setActiveSteps({});

        if (result.allSuccess) {
          setMissionOutcome('SUCCESS');
          const stars = calculateStars(movesLeft, currentLevel.maxMoves);
          const movesUsed = currentLevel.maxMoves - movesLeft;
          const timeRemainingSec = Math.floor(timeTenths / 10);

          setProgress((prev) => {
            const existing = prev[currentLevel.id];
            const updated: Record<string, LevelProgress> = {
              ...prev,
              [currentLevel.id]: {
                completed: true,
                stars: existing
                  ? (Math.max(existing.stars, stars) as 1 | 2 | 3)
                  : stars,
                bestMovesUsed: existing
                  ? Math.min(existing.bestMovesUsed, movesUsed)
                  : movesUsed,
                bestTimeRemaining: existing
                  ? Math.max(existing.bestTimeRemaining, timeRemainingSec)
                  : timeRemainingSec,
              },
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
              // ignore storage errors
            }
            return updated;
          });
        } else {
          setMissionOutcome('FAILED');
          const firstFail = result.packetResults.find((r) => !r.success);
          if (firstFail?.failCoord) {
            setFailCoord(firstFail.failCoord);
          }
        }
        return;
      }

      const nextActive: Record<string, SimulationStep | undefined> = {};
      const newLogs: SimulationLog[] = [];

      for (const pktRes of result.packetResults) {
        const step = pktRes.steps[stepIndex];
        if (step) {
          nextActive[pktRes.packetId] = step;
          const mins = String(Math.floor((stepIndex + 1) / 60)).padStart(2, '0');
          const secs = String((stepIndex + 1) % 60).padStart(2, '0');
          newLogs.push({
            id: `${pktRes.packetId}-${stepIndex}-${Date.now()}`,
            timestamp: `${mins}:${secs}`,
            packetId: pktRes.packetId,
            message: step.logMessage,
            severity: step.severity,
            coord: step.coord,
          });
        }
      }

      setActiveSteps(nextActive);
      setLogs((prev) => [...prev, ...newLogs]);
      stepIndex += 1;
      simTimerRef.current = window.setTimeout(advanceStep, stepDelay);
    };

    simTimerRef.current = window.setTimeout(advanceStep, 100);
  };

  const formatMillisTimer = (tenths: number) => {
    const totalSec = Math.floor(tenths / 10);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    const t = tenths % 10;
    return `${m}:${s}.${t}`;
  };

  const movesUsed = currentLevel.maxMoves - movesLeft;
  const earnedStars = calculateStars(movesLeft, currentLevel.maxMoves);
  const hasNextLevel = currentLevelIdx < LEVELS.length - 1;
  const nodeNumber = String(currentLevelIdx + 1).padStart(2, '0');

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden hw-dot-bg text-slate-200 flex flex-col">
      {/* Top Telemetry Bar (~44px) */}
      <header className="min-h-[44px] border-b border-[#2A303C] bg-[#14171C] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold tracking-wider text-slate-100">
            PACKET_ROUTER
          </span>
          <span className="h-3.5 w-[1px] bg-[#2A303C]" />
          <span className="font-mono text-[11px] font-semibold text-[#38BDF8]">
            NODE_{nodeNumber} // {currentLevel.code.replace(/^\d+_/, '')}
          </span>
        </div>

        {/* Segmented Telemetry & Tactile Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2 py-1 bg-[#0D0F12] border border-[#2A303C] rounded-[2px] font-mono text-[11px]">
            <span className="text-slate-500 mr-1">MOVES:</span>
            <span className={movesLeft <= 3 ? 'text-[#F59E0B] font-bold' : 'text-slate-100 font-bold'}>
              {String(movesLeft).padStart(2, '0')}/{String(currentLevel.maxMoves).padStart(2, '0')}
            </span>
          </div>

          <div className="px-2 py-1 bg-[#0D0F12] border border-[#2A303C] rounded-[2px] font-mono text-[11px]">
            <span className={timeTenths <= 200 ? 'text-[#EF4444] font-bold' : 'text-[#10B981] font-bold'}>
              {formatMillisTimer(timeTenths)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isSimulating || timeTenths <= 0}
            className="px-2.5 py-1 rounded-[2px] bg-[#38BDF8] hover:bg-[#60CCF9] disabled:opacity-40 text-[#0D0F12] font-mono text-[11px] font-bold uppercase cursor-pointer"
          >
            {isSimulating ? '[TX_ACTIVE]' : '[EXECUTE PING]'}
          </button>

          <button
            type="button"
            onClick={() => setSimSpeed((s) => (s === 1 ? 2 : 1))}
            disabled={isSimulating}
            className={`px-2 py-1 rounded-[2px] border font-mono text-[11px] cursor-pointer ${
              simSpeed === 2
                ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10'
                : 'border-[#2A303C] text-slate-300 bg-[#0D0F12] hover:border-slate-500'
            }`}
          >
            {simSpeed}X
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            disabled={isSimulating || missionOutcome === 'SUCCESS'}
            className="px-2 py-1 rounded-[2px] border border-[#2A303C] bg-[#0D0F12] hover:border-slate-500 font-mono text-[11px] text-slate-300 cursor-pointer disabled:opacity-40"
          >
            {isPaused ? '[RESUME]' : '[PAUSE]'}
          </button>

          <button
            type="button"
            onClick={() => resetLevelState(currentLevel)}
            className="px-2.5 py-1 rounded-[2px] border border-[#2A303C] bg-[#0D0F12] hover:border-[#EF4444] hover:text-[#EF4444] font-mono text-[11px] text-slate-300 cursor-pointer"
          >
            [RESET BOARD]
          </button>

          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="px-2.5 py-1 rounded-[2px] border border-[#2A303C] bg-[#0D0F12] hover:border-[#38BDF8] hover:text-[#38BDF8] font-mono text-[11px] text-slate-300 cursor-pointer"
          >
            [MANUAL]
          </button>
        </div>
      </header>

      {/* Main Split-Pane NOC Workspace */}
      <main className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto p-2.5 sm:p-3 flex flex-col lg:flex-row gap-3">
        {/* Left/Center Main Stage */}
        <section className="flex-1 min-w-0 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LevelSelector
              levels={LEVELS}
              currentIndex={currentLevelIdx}
              progress={progress}
              onSelectLevel={handleSelectLevel}
            />
          </div>

          <div className="hw-chassis rounded-[2px] px-3 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-bold text-slate-200 uppercase">
                {currentLevel.name}
              </div>
              <p className="text-[11px] text-slate-400 truncate sm:whitespace-normal">
                {currentLevel.description}
              </p>
            </div>
          </div>

          {/* Interactive Patch Bay */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[540px]">
              <BoardGrid
                grid={grid}
                poweredCoords={poweredCoords}
                packets={currentLevel.packets}
                activeSteps={activeSteps}
                failCoord={failCoord}
                isSimulating={isSimulating}
                onRotateTile={handleRotateTile}
              />
            </div>
          </div>

          {/* Outcome Strip */}
          {missionOutcome === 'SUCCESS' && simResult && (
            <div className="rounded-[2px] border border-[#10B981] bg-[#10B981]/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className="font-bold text-[#10B981]">
                  200_ACK // ROUTE_VERIFIED
                </span>
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: earnedStars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]"
                    />
                  ))}
                </span>
                <span className="text-slate-300">MOVES: {movesUsed}</span>
                <span className="text-slate-300">HOPS: {simResult.totalHops}</span>
                <span className="text-slate-300">
                  TIME_LEFT: {formatMillisTimer(timeTenths)}
                </span>
              </div>

              {hasNextLevel ? (
                <button
                  type="button"
                  onClick={() => handleSelectLevel(currentLevelIdx + 1)}
                  className="px-3 py-1 rounded-[2px] bg-[#10B981] hover:bg-[#34D399] text-[#0D0F12] font-mono text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  NEXT_NODE
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="font-mono text-[11px] font-bold text-[#10B981]">
                  ALL_10_NODES_VERIFIED
                </span>
              )}
            </div>
          )}

          {missionOutcome === 'FAILED' && (
            <div className="rounded-[2px] border border-[#EF4444] bg-[#EF4444]/10 px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]">
              <span className="text-[#EF4444] font-bold">
                {timeTenths <= 0
                  ? 'ERR_LINK_TIMEOUT // Reset board to retry.'
                  : 'ERR_TX_DROPPED // Inspect Kernel Console and adjust patch bay.'}
              </span>
              {timeTenths <= 0 && (
                <button
                  type="button"
                  onClick={() => resetLevelState(currentLevel)}
                  className="px-2.5 py-1 rounded-[2px] bg-[#EF4444] text-white font-bold cursor-pointer"
                >
                  [RESET]
                </button>
              )}
            </div>
          )}
        </section>

        {/* Right Inspector Rail (~340-360px) */}
        <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-2.5 min-h-0">
          <PacketInspector
            packets={currentLevel.packets}
            results={simResult?.packetResults}
          />
          <TerminalLog logs={logs} onClear={() => setLogs([])} />
        </aside>
      </main>

      <ManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
    </div>
  );
}

export default App;
