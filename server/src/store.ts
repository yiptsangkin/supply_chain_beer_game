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
import { getDb, saveDb } from './db.js';

// ============================================================
// SQLite 持久化存储
// ============================================================

function db() {
  return getDb();
}

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToObj<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[toCamel(key)] = row[key];
  }
  return result as T;
}

// ============================================================
// Game CRUD
// ============================================================

export function saveGame(game: Game): void {
  db().run(
    `INSERT OR REPLACE INTO games (id, code, status, current_round, total_rounds, consumer_demand, host_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [game.id, game.code, game.status, game.currentRound, game.totalRounds, JSON.stringify(game.consumerDemand), game.hostId]
  );
  // Also save players
  for (const player of game.players) {
    db().run(
      `INSERT OR REPLACE INTO players (id, game_id, name, role, connected)
       VALUES (?, ?, ?, ?, ?)`,
      [player.id, game.id, player.name, player.role, player.connected ? 1 : 0]
    );
  }
  saveDb();
}

export function getGame(gameId: string): Game | undefined {
  const stmt = db().prepare('SELECT * FROM games WHERE id = ?');
  stmt.bind([gameId]);
  if (!stmt.step()) return undefined;
  const row = rowToObj<any>(stmt.getAsObject());
  stmt.free();

  const game: Game = {
    id: row.id,
    code: row.code,
    status: row.status,
    currentRound: row.currentRound,
    totalRounds: row.totalRounds,
    consumerDemand: JSON.parse(row.consumerDemand),
    players: getPlayers(gameId),
    hostId: row.hostId,
  };
  return game;
}

export function getGameByCode(code: string): Game | undefined {
  const stmt = db().prepare('SELECT id FROM games WHERE code = ?');
  stmt.bind([code]);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as { id: string };
  stmt.free();
  return getGame(row.id);
}

export function listAllGames(): Game[] {
  const stmt = db().prepare('SELECT id FROM games ORDER BY rowid DESC');
  const games: Game[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string };
    const game = getGame(row.id);
    if (game) games.push(game);
  }
  stmt.free();
  return games;
}

export function deleteGame(gameId: string): void {
  db().run('DELETE FROM games WHERE id = ?', [gameId]);
  db().run('DELETE FROM players WHERE game_id = ?', [gameId]);
  db().run('DELETE FROM round_states WHERE player_id IN (SELECT id FROM players WHERE game_id = ?)', [gameId]);
  db().run('DELETE FROM order_pipeline WHERE from_player_id IN (SELECT id FROM players WHERE game_id = ?)', [gameId]);
  db().run('DELETE FROM shipment_pipeline WHERE from_player_id IN (SELECT id FROM players WHERE game_id = ?)', [gameId]);
  db().run('DELETE FROM game_history WHERE game_id = ?', [gameId]);
  saveDb();
}

// ============================================================
// Player helpers
// ============================================================

function getPlayers(gameId: string): Player[] {
  const stmt = db().prepare('SELECT id, name, role, connected FROM players WHERE game_id = ?');
  stmt.bind([gameId]);
  const players: Player[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    players.push({
      id: row.id,
      name: row.name,
      role: row.role || null,
      connected: !!row.connected,
    });
  }
  stmt.free();
  return players;
}

export function addPlayerToGame(gameId: string, player: Player): Game | undefined {
  db().run(
    'INSERT INTO players (id, game_id, name, role, connected) VALUES (?, ?, ?, ?, ?)',
    [player.id, gameId, player.name, player.role, player.connected ? 1 : 0]
  );
  saveDb();
  return getGame(gameId);
}

export function updatePlayerRole(playerId: string, role: Role): void {
  db().run('UPDATE players SET role = ? WHERE id = ?', [role, playerId]);
  saveDb();
}

export function updatePlayerConnected(playerId: string, connected: boolean): void {
  db().run('UPDATE players SET connected = ? WHERE id = ?', [connected ? 1 : 0, playerId]);
  saveDb();
}

export function removePlayerFromGame(gameId: string, playerId: string): Game | undefined {
  db().run('DELETE FROM players WHERE id = ?', [playerId]);
  saveDb();
  return getGame(gameId);
}

export function findPlayerByRole(gameId: string, role: Role): Player | undefined {
  const stmt = db().prepare('SELECT id, name, role, connected FROM players WHERE game_id = ? AND role = ?');
  stmt.bind([gameId, role]);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as any;
  stmt.free();
  return {
    id: row.id,
    name: row.name,
    role: row.role || null,
    connected: !!row.connected,
  };
}

export function getAvailableRoles(gameId: string): Role[] {
  const stmt = db().prepare('SELECT role FROM players WHERE game_id = ? AND role IS NOT NULL');
  stmt.bind([gameId]);
  const taken = new Set<string>();
  while (stmt.step()) {
    taken.add((stmt.getAsObject() as any).role);
  }
  stmt.free();
  return ROLES.filter((r) => !taken.has(r));
}

export function areAllRolesAssigned(gameId: string): boolean {
  return getAvailableRoles(gameId).length === 0;
}

// ============================================================
// Round state
// ============================================================

export function savePlayerRoundState(state: PlayerRoundState): void {
  db().run(
    `INSERT OR REPLACE INTO round_states
     (player_id, round_number, role, incoming_order, incoming_shipment, inventory, backorder,
      has_decided, order_quantity, holding_cost, shortage_cost, round_cost, cumulative_cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      state.playerId, state.roundNumber, state.role,
      state.incomingOrder, state.incomingShipment, state.inventory, state.backorder,
      state.hasDecided ? 1 : 0, state.orderQuantity,
      state.holdingCost, state.shortageCost, state.roundCost, state.cumulativeCost,
    ]
  );
  saveDb();
}

export function getPlayerRoundState(playerId: string, roundNumber: number): PlayerRoundState | undefined {
  const stmt = db().prepare('SELECT * FROM round_states WHERE player_id = ? AND round_number = ?');
  stmt.bind([playerId, roundNumber]);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = rowToObj<any>(stmt.getAsObject());
  stmt.free();
  return {
    playerId: row.playerId,
    role: row.role,
    roundNumber: row.roundNumber,
    incomingOrder: row.incomingOrder,
    incomingShipment: row.incomingShipment,
    inventory: row.inventory,
    backorder: row.backorder,
    hasDecided: !!row.hasDecided,
    orderQuantity: row.orderQuantity,
    holdingCost: row.holdingCost,
    shortageCost: row.shortageCost,
    roundCost: row.roundCost,
    cumulativeCost: row.cumulativeCost,
  };
}

export function getAllPlayerRoundStates(gameId: string, roundNumber: number): Record<Role, PlayerRoundState> {
  const stmt = db().prepare(
    `SELECT rs.* FROM round_states rs
     JOIN players p ON rs.player_id = p.id
     WHERE p.game_id = ? AND rs.round_number = ?`
  );
  stmt.bind([gameId, roundNumber]);
  const result: Partial<Record<Role, PlayerRoundState>> = {};
  while (stmt.step()) {
    const row = rowToObj<any>(stmt.getAsObject());
    result[row.role] = {
      playerId: row.playerId,
      role: row.role,
      roundNumber: row.roundNumber,
      incomingOrder: row.incomingOrder,
      incomingShipment: row.incomingShipment,
      inventory: row.inventory,
      backorder: row.backorder,
      hasDecided: !!row.hasDecided,
      orderQuantity: row.orderQuantity,
      holdingCost: row.holdingCost,
      shortageCost: row.shortageCost,
      roundCost: row.roundCost,
      cumulativeCost: row.cumulativeCost,
    };
  }
  stmt.free();
  return result as Record<Role, PlayerRoundState>;
}

// ============================================================
// Pipeline
// ============================================================

function toPipelineEntry(row: any): PipelineEntry {
  return {
    fromPlayerId: row.fromPlayerId,
    toPlayerId: row.toPlayerId,
    roundPlaced: row.roundPlaced,
    roundArrives: row.roundArrives,
    quantity: row.quantity,
    processed: !!row.processed,
  };
}

export function addOrderPipeline(entry: PipelineEntry): void {
  db().run(
    `INSERT INTO order_pipeline (from_player_id, to_player_id, round_placed, round_arrives, quantity, processed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.fromPlayerId, entry.toPlayerId, entry.roundPlaced, entry.roundArrives, entry.quantity, entry.processed ? 1 : 0]
  );
  saveDb();
}

export function getArrivingOrders(playerId: string, roundNumber: number): PipelineEntry[] {
  const stmt = db().prepare(
    'SELECT * FROM order_pipeline WHERE to_player_id = ? AND round_arrives = ? AND processed = 0'
  );
  stmt.bind([playerId, roundNumber]);
  const entries: PipelineEntry[] = [];
  while (stmt.step()) {
    entries.push(toPipelineEntry(rowToObj<any>(stmt.getAsObject())));
  }
  stmt.free();
  return entries;
}

export function addShipmentPipeline(entry: PipelineEntry): void {
  db().run(
    `INSERT INTO shipment_pipeline (from_player_id, to_player_id, round_placed, round_arrives, quantity, processed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.fromPlayerId, entry.toPlayerId, entry.roundPlaced, entry.roundArrives, entry.quantity, entry.processed ? 1 : 0]
  );
  saveDb();
}

export function getArrivingShipments(playerId: string, roundNumber: number): PipelineEntry[] {
  const stmt = db().prepare(
    'SELECT * FROM shipment_pipeline WHERE to_player_id = ? AND round_arrives = ? AND processed = 0'
  );
  stmt.bind([playerId, roundNumber]);
  const entries: PipelineEntry[] = [];
  while (stmt.step()) {
    entries.push(toPipelineEntry(rowToObj<any>(stmt.getAsObject())));
  }
  stmt.free();
  return entries;
}

export function markPipelineProcessed(entries: PipelineEntry[]): void {
  // We don't have IDs stored in PipelineEntry, so update by columns
  for (const entry of entries) {
    db().run(
      `UPDATE order_pipeline SET processed = 1
       WHERE from_player_id = ? AND to_player_id = ? AND round_placed = ? AND round_arrives = ?`,
      [entry.fromPlayerId, entry.toPlayerId, entry.roundPlaced, entry.roundArrives]
    );
    db().run(
      `UPDATE shipment_pipeline SET processed = 1
       WHERE from_player_id = ? AND to_player_id = ? AND round_placed = ? AND round_arrives = ?`,
      [entry.fromPlayerId, entry.toPlayerId, entry.roundPlaced, entry.roundArrives]
    );
  }
  saveDb();
}

// ============================================================
// Game history
// ============================================================

export function addGameHistory(gameId: string, entry: GameHistoryEntry): void {
  db().run(
    `INSERT OR REPLACE INTO game_history (game_id, round_number, consumer_demand, player_states)
     VALUES (?, ?, ?, ?)`,
    [gameId, entry.roundNumber, entry.consumerDemand, JSON.stringify(entry.playerStates)]
  );
  saveDb();
}

export function getGameHistory(gameId: string): GameHistoryEntry[] {
  const stmt = db().prepare('SELECT * FROM game_history WHERE game_id = ? ORDER BY round_number');
  stmt.bind([gameId]);
  const entries: GameHistoryEntry[] = [];
  while (stmt.step()) {
    const row = rowToObj<any>(stmt.getAsObject());
    entries.push({
      roundNumber: row.roundNumber,
      consumerDemand: row.consumerDemand,
      playerStates: JSON.parse(row.playerStates),
    });
  }
  stmt.free();
  return entries;
}

// ============================================================
// Game results
// ============================================================

export function computeGameResult(gameId: string): GameResult | undefined {
  const game = getGame(gameId);
  if (!game) return undefined;

  const playerResults: PlayerResult[] = game.players
    .filter((p) => p.role !== null)
    .map((p) => {
      const stmt = db().prepare('SELECT SUM(holding_cost) as hc, SUM(shortage_cost) as sc FROM round_states WHERE player_id = ?');
      stmt.bind([p.id]);
      let totalHoldingCost = 0;
      let totalShortageCost = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        totalHoldingCost = row.hc || 0;
        totalShortageCost = row.sc || 0;
      }
      stmt.free();
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

  playerResults.sort((a, b) => a.totalCost - b.totalCost);
  playerResults.forEach((p, i) => { p.rank = i + 1; });

  return {
    gameId,
    players: playerResults,
    totalRounds: game.currentRound - 1,
    consumerDemand: game.consumerDemand,
  };
}