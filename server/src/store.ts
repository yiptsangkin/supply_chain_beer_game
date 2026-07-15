import type {
  Game,
  Player,
  PlayerRoundState,
  RoundState,
  PipelineEntry,
  GameHistoryEntry,
  GameResult,
  PlayerResult,
  Role,
} from '@beer-game/shared';
import { ROLES } from '@beer-game/shared';

// ============================================================
// 内存存储
// ============================================================

const games = new Map<string, Game>();
const playerStates = new Map<string, PlayerRoundState[]>(); // gameId:playerId -> round states
const orderPipelines = new Map<string, PipelineEntry[]>(); // gameId -> pipeline entries
const shipmentPipelines = new Map<string, PipelineEntry[]>(); // gameId -> pipeline entries
const gameHistory = new Map<string, GameHistoryEntry[]>(); // gameId -> history entries

// ============================================================
// Game CRUD
// ============================================================

export function saveGame(game: Game): void {
  games.set(game.id, game);
}

export function getGame(gameId: string): Game | undefined {
  return games.get(gameId);
}

export function listAllGames(): Game[] {
  return Array.from(games.values());
}

export function getGameByCode(code: string): Game | undefined {
  for (const game of games.values()) {
    if (game.code === code) {
      return game;
    }
  }
  return undefined;
}

export function deleteGame(gameId: string): void {
  games.delete(gameId);
  playerStates.delete(gameId);
  orderPipelines.delete(gameId);
  shipmentPipelines.delete(gameId);
  gameHistory.delete(gameId);
}

// ============================================================
// Player helpers
// ============================================================

export function addPlayerToGame(gameId: string, player: Player): Game | undefined {
  const game = games.get(gameId);
  if (!game) return undefined;
  game.players.push(player);
  return game;
}

export function removePlayerFromGame(gameId: string, playerId: string): Game | undefined {
  const game = games.get(gameId);
  if (!game) return undefined;
  game.players = game.players.filter((p) => p.id !== playerId);
  return game;
}

export function findPlayerByRole(gameId: string, role: Role): Player | undefined {
  const game = games.get(gameId);
  if (!game) return undefined;
  return game.players.find((p) => p.role === role);
}

export function getAvailableRoles(gameId: string): Role[] {
  const game = games.get(gameId);
  if (!game) return [];
  const taken = new Set(game.players.map((p) => p.role));
  return ROLES.filter((r) => !taken.has(r));
}

export function areAllRolesAssigned(gameId: string): boolean {
  const game = games.get(gameId);
  if (!game) return false;
  return ROLES.every((r) => game.players.some((p) => p.role === r));
}

// ============================================================
// Round state
// ============================================================

export function savePlayerRoundState(state: PlayerRoundState): void {
  const key = `${state.playerId}`;
  if (!playerStates.has(key)) {
    playerStates.set(key, []);
  }
  const states = playerStates.get(key)!;
  const idx = states.findIndex((s) => s.roundNumber === state.roundNumber);
  if (idx >= 0) {
    states[idx] = state;
  } else {
    states.push(state);
  }
}

export function getPlayerRoundState(playerId: string, roundNumber: number): PlayerRoundState | undefined {
  const states = playerStates.get(playerId);
  if (!states) return undefined;
  return states.find((s) => s.roundNumber === roundNumber);
}

export function getAllPlayerRoundStates(gameId: string, roundNumber: number): Record<Role, PlayerRoundState> {
  const game = games.get(gameId);
  if (!game) return {} as Record<Role, PlayerRoundState>;
  const result: Partial<Record<Role, PlayerRoundState>> = {};
  for (const player of game.players) {
    if (player.role) {
      const state = getPlayerRoundState(player.id, roundNumber);
      if (state) {
        result[player.role] = state;
      }
    }
  }
  return result as Record<Role, PlayerRoundState>;
}

// ============================================================
// Pipeline
// ============================================================

export function addOrderPipeline(entry: PipelineEntry): void {
  if (!orderPipelines.has(entry.fromPlayerId)) {
    orderPipelines.set(entry.fromPlayerId, []);
  }
  orderPipelines.get(entry.fromPlayerId)!.push(entry);
}

export function getArrivingOrders(playerId: string, roundNumber: number): PipelineEntry[] {
  const entries = orderPipelines.get(playerId);
  if (!entries) return [];
  return entries.filter((e) => e.roundArrives === roundNumber && !e.processed);
}

export function addShipmentPipeline(entry: PipelineEntry): void {
  if (!shipmentPipelines.has(entry.toPlayerId)) {
    shipmentPipelines.set(entry.toPlayerId, []);
  }
  shipmentPipelines.get(entry.toPlayerId)!.push(entry);
}

export function getArrivingShipments(playerId: string, roundNumber: number): PipelineEntry[] {
  const entries = shipmentPipelines.get(playerId);
  if (!entries) return [];
  return entries.filter((e) => e.roundArrives === roundNumber && !e.processed);
}

export function markPipelineProcessed(entries: PipelineEntry[]): void {
  for (const entry of entries) {
    entry.processed = true;
  }
}

// ============================================================
// Game history
// ============================================================

export function addGameHistory(gameId: string, entry: GameHistoryEntry): void {
  if (!gameHistory.has(gameId)) {
    gameHistory.set(gameId, []);
  }
  gameHistory.get(gameId)!.push(entry);
}

export function getGameHistory(gameId: string): GameHistoryEntry[] {
  return gameHistory.get(gameId) ?? [];
}

// ============================================================
// Game results
// ============================================================

export function computeGameResult(gameId: string): GameResult | undefined {
  const game = games.get(gameId);
  if (!game) return undefined;

  const playerResults: PlayerResult[] = game.players
    .filter((p) => p.role !== null)
    .map((p) => {
      const states = playerStates.get(p.id) ?? [];
      const totalHoldingCost = states.reduce((sum, s) => sum + s.holdingCost, 0);
      const totalShortageCost = states.reduce((sum, s) => sum + s.shortageCost, 0);
      return {
        playerId: p.id,
        name: p.name,
        role: p.role!,
        totalHoldingCost,
        totalShortageCost,
        totalCost: totalHoldingCost + totalShortageCost,
        rank: 0,
      };
    });

  // Sort by total cost ascending (lowest cost = best)
  playerResults.sort((a, b) => a.totalCost - b.totalCost);
  playerResults.forEach((p, i) => {
    p.rank = i + 1;
  });

  return {
    gameId,
    players: playerResults,
    totalRounds: game.currentRound - 1,
    consumerDemand: game.consumerDemand,
  };
}