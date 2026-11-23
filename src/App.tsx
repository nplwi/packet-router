import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  RotateCcw,
  Pause,
  BookOpen,
  Network,
  Clock,
  Sliders,
  FastForward,
  ArrowRight,
  Star,
  AlertTriangle,
} from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState(currentLevel.timeLimit);
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
    setTimeLeft(level.timeLimit);
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

  // Countdown timer during planning phase
  useEffect(() => {
    if (isPaused || isSimulating || missionOutcome === 'SUCCESS' || timeLeft <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setMissionOutcome('FAILED');
          setLogs((old) => [
            ...old,
            {
              id: `timeout-${Date.now()}`,
              timestamp: '00:00',
              packetId: 'SYS',
              message: 'ERR_LINK_TIMEOUT // Countdown expired. Reset board to retry.',
              severity: 'error',
            },
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPaused, isSimulating, missionOutcome, timeLeft]);

  useEffect(() => {
    return () => clearSimTimer();
  }, []);

  const poweredCoords = useMemo(() => {
    const sources = currentLevel.packets.map((p) => p.sourceCoord);
    return getPoweredCoords(grid, sources);
  }, [grid, currentLevel.packets]);

  const handleRotateTile = (row: number, col: number) => {
    if (isSimulating || missionOutcome === 'SUCCESS' || timeLeft <= 0) return;
    if (movesLeft <= 0) {
      setLogs((prev) => [
        ...prev,
        {
          id: `nomoves-${Date.now()}`,
          timestamp: 'SYS',
          packetId: 'SYS',
          message: 'WARN_MOVE_BUDGET_DEPLETED // Press SEND PACKET or RESET.',
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
    if (isSimulating || timeLeft <= 0) return;

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
      message: `PING_EXEC // Dispatching ${currentLevel.packets.length} packet(s) @ ${simSpeed}x...`,
      severity: 'info',
    };
    setLogs([bootLog]);

    let stepIndex = 0;
    const stepDelay = simSpeed === 2 ? 170 : 340;

    const advanceStep = () => {
      if (stepIndex >= maxSteps) {
        setIsSimulating(false);
        setActiveSteps({});

        if (result.allSuccess) {
          setMissionOutcome('SUCCESS');
          const stars = calculateStars(movesLeft, currentLevel.maxMoves);
          const movesUsed = currentLevel.maxMoves - movesLeft;

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
                  ? Math.max(existing.bestTimeRemaining, timeLeft)
                  : timeLeft,
              },
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
              // ignore storage quota errors
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

    simTimerRef.current = window.setTimeout(advanceStep, 120);
  };

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const movesUsed = currentLevel.maxMoves - movesLeft;
  const earnedStars = calculateStars(movesLeft, currentLevel.maxMoves);
  const hasNextLevel = currentLevelIdx < LEVELS.length - 1;

  return (
    <div className="min-h-screen noc-grid-bg text-slate-200 flex flex-col">
      {/* Top NOC Header */}
      <header className="border-b border-[#263042] bg-[#0E131B]/95 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-[#00E5FF]/10 border border-[#00E5FF]/40">
              <Network className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <div>
              <h1 className="font-mono text-sm sm:text-base font-bold tracking-wider text-slate-100">
                PACKET ROUTER <span className="text-[#00E5FF]">// v1.0</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Tactical Network Topology &amp; Security Puzzle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LevelSelector
              levels={LEVELS}
              currentIndex={currentLevelIdx}
              progress={progress}
              onSelectLevel={handleSelectLevel}
            />
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="px-3 py-1.5 rounded-sm border border-[#263042] bg-[#131822] hover:border-[#00E5FF]/60 font-mono text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="hidden sm:inline">MANUAL</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left/Center Column: Telemetry Bar + Board + Action Controls */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Level Brief & Telemetry */}
          <div className="noc-panel rounded-md p-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] text-[#00E5FF] uppercase">
                  {currentLevel.code}
                </span>
                <h2 className="text-sm font-semibold text-slate-100">
                  {currentLevel.name}
                </h2>
              </div>

              {/* Telemetry Counters */}
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-sm bg-[#0B0E14] border border-[#263042] flex items-center gap-1.5 font-mono text-xs">
                  <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span className="text-slate-400">MOVES:</span>
                  <span
                    className={`font-bold ${
                      movesLeft <= 3 ? 'text-[#FFB000]' : 'text-slate-100'
                    }`}
                  >
                    {movesLeft}/{currentLevel.maxMoves}
                  </span>
                </div>

                <div className="px-2.5 py-1 rounded-sm bg-[#0B0E14] border border-[#263042] flex items-center gap-1.5 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span
                    className={`font-bold ${
                      timeLeft <= 20 ? 'text-[#FF3B30]' : 'text-slate-100'
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {currentLevel.description}
            </p>
          </div>

          {/* Interactive Patch Matrix */}
          <BoardGrid
            grid={grid}
            poweredCoords={poweredCoords}
            packets={currentLevel.packets}
            activeSteps={activeSteps}
            failCoord={failCoord}
            isSimulating={isSimulating}
            onRotateTile={handleRotateTile}
          />

          {/* Control Bar */}
          <div className="noc-panel rounded-md p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExecute}
                disabled={isSimulating || timeLeft <= 0}
                className="px-4 py-2 rounded-sm bg-[#00E5FF] hover:bg-[#33ECFF] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0E14] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isSimulating ? 'TRANSMITTING...' : 'SEND PACKET'}
              </button>

              <button
                type="button"
                onClick={() => setSimSpeed((s) => (s === 1 ? 2 : 1))}
                disabled={isSimulating}
                className={`px-2.5 py-2 rounded-sm border font-mono text-xs flex items-center gap-1 cursor-pointer ${
                  simSpeed === 2
                    ? 'border-[#FFB000]/70 text-[#FFB000] bg-[#FFB000]/10'
                    : 'border-[#263042] text-slate-300 bg-[#0B0E14] hover:border-slate-500'
                }`}
                title="Toggle simulation playback speed"
              >
                <FastForward className="w-3.5 h-3.5" />
                {simSpeed}x
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                disabled={isSimulating || missionOutcome === 'SUCCESS'}
                className="px-3 py-2 rounded-sm border border-[#263042] bg-[#0B0E14] hover:border-slate-500 font-mono text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Pause className="w-3.5 h-3.5" />
                {isPaused ? 'RESUME' : 'PAUSE'}
              </button>

              <button
                type="button"
                onClick={() => resetLevelState(currentLevel)}
                className="px-3 py-2 rounded-sm border border-[#263042] bg-[#0B0E14] hover:border-[#FF3B30]/60 hover:text-[#FF3B30] font-mono text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                RESET
              </button>
            </div>
          </div>

          {/* Outcome Banner */}
          {missionOutcome === 'SUCCESS' && simResult && (
            <div className="rounded-md border border-[#00E676]/60 bg-[#00E676]/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-[#00E676]">
                    200_OK // ROUTE VERIFIED
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: earnedStars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-[#FFB000] text-[#FFB000]"
                      />
                    ))}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 flex flex-wrap gap-3">
                  <span>MOVES_USED: {movesUsed}</span>
                  <span>TOTAL_HOPS: {simResult.totalHops}</span>
                  <span>TIME_LEFT: {formatTime(timeLeft)}</span>
                </div>
              </div>

              {hasNextLevel ? (
                <button
                  type="button"
                  onClick={() => handleSelectLevel(currentLevelIdx + 1)}
                  className="px-3.5 py-2 rounded-sm bg-[#00E676] hover:bg-[#33EB91] text-[#0B0E14] font-mono text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  NEXT SECTOR
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="font-mono text-xs font-bold text-[#00E676]">
                  ALL SECTORS SECURED
                </span>
              )}
            </div>
          )}

          {missionOutcome === 'FAILED' && (
            <div className="rounded-md border border-[#FF3B30]/60 bg-[#FF3B30]/10 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                <div className="font-mono text-xs text-slate-200">
                  {timeLeft <= 0
                    ? 'TIMEOUT // Reset the board to try again.'
                    : 'TRANSMISSION DROPPED // Inspect Trace Log, adjust pipes, and re-run.'}
                </div>
              </div>
              {timeLeft <= 0 && (
                <button
                  type="button"
                  onClick={() => resetLevelState(currentLevel)}
                  className="px-3 py-1.5 rounded-sm bg-[#FF3B30] text-white font-mono text-xs font-bold cursor-pointer"
                >
                  RETRY
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Packet Inspector + Terminal Log */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <PacketInspector
            packets={currentLevel.packets}
            results={simResult?.packetResults}
          />
          <TerminalLog logs={logs} onClear={() => setLogs([])} />
        </div>
      </main>

      <ManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
    </div>
  );
}

export default App;
