// ============================================================
// 啤酒游戏 - 共享类型定义
// ============================================================

export type Role = 'retailer' | 'wholesaler' | 'distributor' | 'factory';

export type GameStatus = 'waiting' | 'active' | 'finished';

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  connected: boolean;
}

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  consumerDemand: number[];
  players: Player[];
  hostId: string;
}

export interface PlayerRoundState {
  playerId: string;
  role: Role;
  roundNumber: number;
  incomingOrder: number;
  incomingShipment: number;
  inventory: number;
  backorder: number;
  hasDecided: boolean;
  orderQuantity: number | null;
  holdingCost: number;
  shortageCost: number;
  roundCost: number;
  cumulativeCost: number;
}

export interface RoundState {
  roundNumber: number;
  playerStates: Record<Role, PlayerRoundState>;
  allDecided: boolean;
  consumerDemand: number;
}

export interface RoundDecision {
  gameId: string;
  playerId: string;
  roundNumber: number;
  orderQuantity: number;
}

export interface PipelineEntry {
  fromPlayerId: string;
  toPlayerId: string;
  roundPlaced: number;
  roundArrives: number;
  quantity: number;
  processed: boolean;
}

export interface PlayerResult {
  playerId: string;
  name: string;
  role: Role;
  totalHoldingCost: number;
  totalShortageCost: number;
  totalCost: number;
  rank: number;
}

export interface GameResult {
  gameId: string;
  players: PlayerResult[];
  totalRounds: number;
  consumerDemand: number[];
}

export interface GameHistoryEntry {
  roundNumber: number;
  consumerDemand: number;
  playerStates: Record<Role, PlayerRoundState>;
}