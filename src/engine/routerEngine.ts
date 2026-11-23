import type {
  Coord,
  Direction,
  GridTile,
  LevelConfig,
  LevelSimulationResult,
  PacketConfig,
  PacketSimulationResult,
  PipeType,
  Rotation,
  SimulationLog,
  SimulationStep,
} from '../types/game';

const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

const OPPOSITE_DIR: Record<Direction, Direction> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

const DIR_DELTA: Record<Direction, { dr: number; dc: number }> = {
  N: { dr: -1, dc: 0 },
  E: { dr: 0, dc: 1 },
  S: { dr: 1, dc: 0 },
  W: { dr: 0, dc: -1 },
};

const BASE_PORTS: Record<PipeType, Direction[]> = {
  NONE: [],
  STRAIGHT: ['N', 'S'],
  ELBOW: ['N', 'E'],
  TEE: ['N', 'E', 'W'],
  CROSS: ['N', 'E', 'S', 'W'],
  BRIDGE: ['N', 'E', 'S', 'W'],
};

/**
 * Rotate a single cardinal direction clockwise by `rotation` degrees.
 */
export function rotateDirection(dir: Direction, rotation: Rotation): Direction {
  const idx = DIRECTIONS.indexOf(dir);
  const steps = (rotation / 90) % 4;
  return DIRECTIONS[(idx + steps) % 4];
}

/**
 * Return the next clockwise rotation (0 -> 90 -> 180 -> 270 -> 0).
 */
export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}

/**
 * Get the active open ports of a tile given its pipeType and rotation.
 */
export function getTilePorts(tile: GridTile): Direction[] {
  const base = BASE_PORTS[tile.pipeType];
  if (tile.pipeType === 'BRIDGE' || tile.pipeType === 'CROSS' || tile.pipeType === 'NONE') {
    return base;
  }
  return base.map((d) => rotateDirection(d, tile.rotation));
}

/**
 * Given a tile and the direction from which a packet enters it,
 * return the valid outgoing directions from this tile.
 * Handles BRIDGE isolation (N<->S and E<->W do not cross).
 */
export function getOutgoingDirections(
  tile: GridTile,
  incomingDir: Direction | null
): Direction[] {
  const ports = getTilePorts(tile);

  if (incomingDir === null) {
    // Starting at SOURCE: can exit any open port
    return ports;
  }

  if (!ports.includes(incomingDir)) {
    return [];
  }

  if (tile.pipeType === 'BRIDGE') {
    // Isolated overpass: N<->S and E<->W only
    return [OPPOSITE_DIR[incomingDir]];
  }

  return ports.filter((d) => d !== incomingDir);
}

/**
 * Check if moving from `fromTile` in direction `dir` connects to a valid neighbor tile.
 */
export function getConnectedNeighbor(
  grid: GridTile[][],
  fromTile: GridTile,
  dir: Direction
): { tile: GridTile; incomingDir: Direction } | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const { dr, dc } = DIR_DELTA[dir];
  const nr = fromTile.row + dr;
  const nc = fromTile.col + dc;

  if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
    return null;
  }

  const neighbor = grid[nr][nc];
  const incomingDir = OPPOSITE_DIR[dir];
  const neighborPorts = getTilePorts(neighbor);

  if (!neighborPorts.includes(incomingDir)) {
    return null;
  }

  return { tile: neighbor, incomingDir };
}

/**
 * Build a 2D grid matrix from a flat tile array.
 */
export function buildGrid(rows: number, cols: number, tiles: GridTile[]): GridTile[][] {
  const grid: GridTile[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r,
      col: c,
      pipeType: 'NONE' as PipeType,
      rotation: 0 as Rotation,
      nodeType: 'NONE',
    }))
  );

  for (const tile of tiles) {
    if (tile.row >= 0 && tile.row < rows && tile.col >= 0 && tile.col < cols) {
      grid[tile.row][tile.col] = { ...tile };
    }
  }

  return grid;
}

/**
 * Compute all coordinates reachable from any SOURCE tile (used for planning-phase topology preview).
 */
export function getPoweredCoords(grid: GridTile[][], sources: Coord[]): Set<string> {
  const powered = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ row: number; col: number; incomingDir: Direction | null }> = [];

  for (const src of sources) {
    queue.push({ row: src.row, col: src.col, incomingDir: null });
    powered.add(`${src.row},${src.col}`);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const stateKey = `${current.row},${current.col},${current.incomingDir ?? 'SRC'}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);

    const tile = grid[current.row][current.col];
    const outDirs = getOutgoingDirections(tile, current.incomingDir);

    for (const dir of outDirs) {
      const next = getConnectedNeighbor(grid, tile, dir);
      if (next) {
        powered.add(`${next.tile.row},${next.tile.col}`);
        queue.push({
          row: next.tile.row,
          col: next.tile.col,
          incomingDir: next.incomingDir,
        });
      }
    }
  }

  return powered;
}

interface SearchNode {
  row: number;
  col: number;
  incomingDir: Direction | null;
  encrypted: boolean;
  hops: number;
  steps: SimulationStep[];
}

function coordKey(c: Coord): string {
  return `(${c.col},${c.row})`;
}

/**
 * Simulate routing for a single packet using BFS state-space traversal.
 */
export function simulatePacket(
  grid: GridTile[][],
  packet: PacketConfig
): PacketSimulationResult {
  const startTile = grid[packet.sourceCoord.row]?.[packet.sourceCoord.col];
  if (!startTile) {
    return {
      packetId: packet.id,
      success: false,
      errorCode: 'ERR_INVALID_SOURCE',
      steps: [],
      totalHops: 0,
    };
  }

  const initialStep: SimulationStep = {
    packetId: packet.id,
    coord: { ...packet.sourceCoord },
    incomingDir: null,
    outgoingDir: null,
    encrypted: packet.encrypted,
    hopCount: 0,
    event: 'SPAWN',
    logMessage: `${packet.id} [${packet.protocol}]TX_INIT @ ${coordKey(packet.sourceCoord)}${
      packet.encrypted ? ' [ENCRYPTED]' : ''
    }`,
    severity: 'info',
  };

  const queue: SearchNode[] = [
    {
      row: packet.sourceCoord.row,
      col: packet.sourceCoord.col,
      incomingDir: null,
      encrypted: packet.encrypted,
      hops: 0,
      steps: [initialStep],
    },
  ];

  const visited = new Set<string>();
  let malwareHitResult: PacketSimulationResult | null = null;
  let bestSuccessResult: PacketSimulationResult | null = null;
  let firewallFailResult: PacketSimulationResult | null = null;
  let encryptedDestResult: PacketSimulationResult | null = null;
  let ttlFailResult: PacketSimulationResult | null = null;
  let longestDeadEndSteps: SimulationStep[] = [initialStep];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const visitKey = `${current.row},${current.col},${current.incomingDir ?? 'SRC'},${
      current.encrypted ? 1 : 0
    }`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    const tile = grid[current.row][current.col];
    const outDirs = getOutgoingDirections(tile, current.incomingDir);

    if (current.steps.length > longestDeadEndSteps.length) {
      longestDeadEndSteps = current.steps;
    }

    for (const dir of outDirs) {
      const next = getConnectedNeighbor(grid, tile, dir);
      if (!next) continue;

      const nextTile = next.tile;
      const nextHops = current.hops + 1;
      let nextEncrypted = current.encrypted;

      // Update outgoing direction on the previous step copy
      const updatedSteps = current.steps.map((s, idx) =>
        idx === current.steps.length - 1 ? { ...s, outgoingDir: dir } : s
      );

      // 1. Check MALWARE first (any connected malware compromises the route)
      if (nextTile.nodeType === 'MALWARE') {
        const failStep: SimulationStep = {
          packetId: packet.id,
          coord: { row: nextTile.row, col: nextTile.col },
          incomingDir: next.incomingDir,
          outgoingDir: null,
          encrypted: nextEncrypted,
          hopCount: nextHops,
          event: 'MALWARE_HIT',
          logMessage: `${packet.id} -> Hop ${coordKey(nextTile)} [ERR_MALWARE_TRAP_TRIGGERED] Signal leaked to honeypot!`,
          severity: 'error',
        };
        if (!malwareHitResult) {
          malwareHitResult = {
            packetId: packet.id,
            success: false,
            errorCode: 'ERR_MALWARE_TRAP_TRIGGERED',
            failCoord: { row: nextTile.row, col: nextTile.col },
            steps: [...updatedSteps, failStep],
            totalHops: nextHops,
          };
        }
        continue;
      }

      // 2. Check FIREWALL
      if (nextTile.nodeType === 'FIREWALL') {
        const rule = nextTile.firewallRule ?? 'DECRYPTED_ONLY';
        const rejectedByDecrypt = rule === 'DECRYPTED_ONLY' && nextEncrypted;
        const rejectedByAuth = rule === 'AUTH_ONLY' && !packet.authTag;

        if (rejectedByDecrypt || rejectedByAuth) {
          const errCode = rejectedByDecrypt
            ? 'ERR_ENCRYPTED_PAYLOAD_REJECTED'
            : 'ERR_AUTH_TOKEN_MISSING';
          const failStep: SimulationStep = {
            packetId: packet.id,
            coord: { row: nextTile.row, col: nextTile.col },
            incomingDir: next.incomingDir,
            outgoingDir: null,
            encrypted: nextEncrypted,
            hopCount: nextHops,
            event: 'FIREWALL_DROP',
            logMessage: `${packet.id} -> Hop ${coordKey(nextTile)} [${errCode}] Dropped by Firewall.`,
            severity: 'error',
          };
          if (!firewallFailResult) {
            firewallFailResult = {
              packetId: packet.id,
              success: false,
              errorCode: errCode,
              failCoord: { row: nextTile.row, col: nextTile.col },
              steps: [...updatedSteps, failStep],
              totalHops: nextHops,
            };
          }
          continue;
        }
      }

      // 3. Check DECRYPTOR
      let stepEvent: SimulationStep['event'] = 'FORWARD';
      let stepSeverity: SimulationStep['severity'] = 'info';
      let stepMsg = `${packet.id} -> Hop ${coordKey(nextTile)} [FWD_OK]`;

      if (nextTile.nodeType === 'FIREWALL') {
        stepEvent = 'FIREWALL_PASS';
        stepMsg = `${packet.id} -> Hop ${coordKey(nextTile)} [FW_ALLOW] -> Forwarding...`;
      }

      if (nextTile.nodeType === 'DECRYPTOR') {
        if (nextEncrypted) {
          nextEncrypted = false;
          stepEvent = 'DECRYPT';
          stepSeverity = 'warn';
          stepMsg = `${packet.id} -> Hop ${coordKey(nextTile)} [DECRYPT_OK] TLS offloaded -> Forwarding...`;
        } else {
          stepMsg = `${packet.id} -> Hop ${coordKey(nextTile)} [DECRYPT_BYPASS] Already plaintext.`;
        }
      }

      // 4. Check DESTINATION
      if (
        nextTile.row === packet.destCoord.row &&
        nextTile.col === packet.destCoord.col
      ) {
        if (nextEncrypted) {
          const failStep: SimulationStep = {
            packetId: packet.id,
            coord: { row: nextTile.row, col: nextTile.col },
            incomingDir: next.incomingDir,
            outgoingDir: null,
            encrypted: nextEncrypted,
            hopCount: nextHops,
            event: 'REJECTED_ENCRYPTED',
            logMessage: `${packet.id} -> Dest ${coordKey(nextTile)} [ERR_UNREADABLE_PAYLOAD] Must pass DECRYPTOR first!`,
            severity: 'error',
          };
          if (!encryptedDestResult) {
            encryptedDestResult = {
              packetId: packet.id,
              success: false,
              errorCode: 'ERR_UNREADABLE_PAYLOAD',
              failCoord: { row: nextTile.row, col: nextTile.col },
              steps: [...updatedSteps, failStep],
              totalHops: nextHops,
            };
          }
          continue;
        }

        if (packet.maxHops !== undefined && nextHops > packet.maxHops) {
          const failStep: SimulationStep = {
            packetId: packet.id,
            coord: { row: nextTile.row, col: nextTile.col },
            incomingDir: next.incomingDir,
            outgoingDir: null,
            encrypted: nextEncrypted,
            hopCount: nextHops,
            event: 'TTL_EXCEEDED',
            logMessage: `${packet.id} -> Dest ${coordKey(nextTile)} [ERR_TTL_EXCEEDED] ${nextHops} hops > max ${packet.maxHops}.`,
            severity: 'error',
          };
          if (!ttlFailResult) {
            ttlFailResult = {
              packetId: packet.id,
              success: false,
              errorCode: 'ERR_TTL_EXCEEDED',
              failCoord: { row: nextTile.row, col: nextTile.col },
              steps: [...updatedSteps, failStep],
              totalHops: nextHops,
            };
          }
          continue;
        }

        // Valid delivery!
        const successStep: SimulationStep = {
          packetId: packet.id,
          coord: { row: nextTile.row, col: nextTile.col },
          incomingDir: next.incomingDir,
          outgoingDir: null,
          encrypted: nextEncrypted,
          hopCount: nextHops,
          event: 'DELIVERED',
          logMessage: `${packet.id} -> Dest ${coordKey(nextTile)} [200_ACK] Delivered in ${nextHops} hops.`,
          severity: 'success',
        };

        // Record valid delivery, but continue BFS to ensure no TEE/CROSS branch hits MALWARE
        if (!bestSuccessResult) {
          bestSuccessResult = {
            packetId: packet.id,
            success: true,
            steps: [...updatedSteps, successStep],
            totalHops: nextHops,
          };
        }
        continue;
      }

      const nextStep: SimulationStep = {
        packetId: packet.id,
        coord: { row: nextTile.row, col: nextTile.col },
        incomingDir: next.incomingDir,
        outgoingDir: null,
        encrypted: nextEncrypted,
        hopCount: nextHops,
        event: stepEvent,
        logMessage: stepMsg,
        severity: stepSeverity,
      };

      queue.push({
        row: nextTile.row,
        col: nextTile.col,
        incomingDir: next.incomingDir,
        encrypted: nextEncrypted,
        hops: nextHops,
        steps: [...updatedSteps, nextStep],
      });
    }
  }

  if (malwareHitResult) return malwareHitResult;
  if (bestSuccessResult) return bestSuccessResult;
  if (firewallFailResult) return firewallFailResult;
  if (encryptedDestResult) return encryptedDestResult;
  if (ttlFailResult) return ttlFailResult;

  const lastStep = longestDeadEndSteps[longestDeadEndSteps.length - 1];
  const deadEndStep: SimulationStep = {
    ...lastStep,
    event: 'DEAD_END',
    logMessage: `${packet.id} @ ${coordKey(lastStep.coord)} [ERR_NO_ROUTE_TO_HOST] Incomplete link.`,
    severity: 'error',
  };

  return {
    packetId: packet.id,
    success: false,
    errorCode: 'ERR_NO_ROUTE_TO_HOST',
    failCoord: { ...lastStep.coord },
    steps: [...longestDeadEndSteps.slice(0, -1), deadEndStep],
    totalHops: lastStep.hopCount,
  };
}

/**
 * Simulate all packets in a level and aggregate logs & results.
 */
export function simulateLevel(
  grid: GridTile[][],
  level: LevelConfig
): LevelSimulationResult {
  const packetResults = level.packets.map((pkt) => simulatePacket(grid, pkt));
  const allSuccess = packetResults.every((r) => r.success);
  const totalHops = packetResults.reduce((acc, r) => acc + r.totalHops, 0);

  const logs: SimulationLog[] = [];
  let tick = 0;

  for (const res of packetResults) {
    for (const step of res.steps) {
      tick += 1;
      const mins = String(Math.floor(tick / 60)).padStart(2, '0');
      const secs = String(tick % 60).padStart(2, '0');
      logs.push({
        id: `${res.packetId}-${tick}`,
        timestamp: `${mins}:${secs}`,
        packetId: res.packetId,
        message: step.logMessage,
        severity: step.severity,
        coord: step.coord,
      });
    }
  }

  return {
    allSuccess,
    packetResults,
    logs,
    totalHops,
  };
}

/**
 * Calculate 1-3 star rating based on moves remaining relative to maxMoves.
 */
export function calculateStars(movesLeft: number, maxMoves: number): 1 | 2 | 3 {
  if (maxMoves <= 0) return 3;
  const ratio = movesLeft / maxMoves;
  if (ratio >= 0.35) return 3;
  if (ratio >= 0.15) return 2;
  return 1;
}
