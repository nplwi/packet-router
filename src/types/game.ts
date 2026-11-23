export type Direction = 'N' | 'E' | 'S' | 'W';

export type Rotation = 0 | 90 | 180 | 270;

export type PipeType = 'NONE' | 'STRAIGHT' | 'ELBOW' | 'TEE' | 'CROSS' | 'BRIDGE';

export type NodeType =
  | 'NONE'
  | 'SOURCE'
  | 'DESTINATION'
  | 'DECRYPTOR'
  | 'FIREWALL'
  | 'MALWARE';

export type FirewallRule = 'DECRYPTED_ONLY' | 'AUTH_ONLY';

export type PacketType = 'STANDARD' | 'ENCRYPTED' | 'PRIORITY';

export interface Coord {
  row: number;
  col: number;
}

export interface GridTile {
  row: number;
  col: number;
  pipeType: PipeType;
  rotation: Rotation;
  nodeType: NodeType;
  locked?: boolean;
  label?: string;
  firewallRule?: FirewallRule;
  /** Optional ID for matching specific source/dest in multi-packet levels */
  nodeId?: string;
}

export interface PacketConfig {
  id: string;
  label: string;
  protocol: string;
  type: PacketType;
  sourceCoord: Coord;
  destCoord: Coord;
  encrypted: boolean;
  authTag?: boolean;
  maxHops?: number;
}

export interface LevelConfig {
  id: string;
  code: string;
  name: string;
  description: string;
  rows: number;
  cols: number;
  maxMoves: number;
  timeLimit: number; // in seconds
  packets: PacketConfig[];
  tiles: GridTile[];
}

export type LogSeverity = 'info' | 'success' | 'warn' | 'error';

export interface SimulationLog {
  id: string;
  timestamp: string;
  packetId: string;
  message: string;
  severity: LogSeverity;
  coord?: Coord;
}

export interface SimulationStep {
  packetId: string;
  coord: Coord;
  incomingDir: Direction | null;
  outgoingDir: Direction | null;
  encrypted: boolean;
  hopCount: number;
  event:
    | 'SPAWN'
    | 'FORWARD'
    | 'DECRYPT'
    | 'FIREWALL_PASS'
    | 'FIREWALL_DROP'
    | 'MALWARE_HIT'
    | 'DELIVERED'
    | 'REJECTED_ENCRYPTED'
    | 'TTL_EXCEEDED'
    | 'DEAD_END';
  logMessage: string;
  severity: LogSeverity;
}

export interface PacketSimulationResult {
  packetId: string;
  success: boolean;
  errorCode?: string;
  failCoord?: Coord;
  steps: SimulationStep[];
  totalHops: number;
}

export interface LevelSimulationResult {
  allSuccess: boolean;
  packetResults: PacketSimulationResult[];
  logs: SimulationLog[];
  totalHops: number;
}

export interface LevelProgress {
  completed: boolean;
  stars: 1 | 2 | 3;
  bestMovesUsed: number;
  bestTimeRemaining: number;
}
