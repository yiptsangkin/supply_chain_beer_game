import type {
  Game,
  Player,
  PlayerRoundState,
  RoundState,
  Role,
} from '@beer-game/shared';
import {
  HOLDING_COST_PER_UNIT,
  SHORTAGE_COST_PER_UNIT,
  ORDER_DELAY_ROUNDS,
  SHIPMENT_DELAY_ROUNDS,
  UPSTREAM_MAP,
  DOWNSTREAM_MAP,
  generateConsumerDemand,
  DEFAULT_TOTAL_ROUNDS,
} from '@beer-game/shared';
import * as store from './store.js';
import { generateId, generateGameCode } from './utils.js';

// ============================================================
// 游戏创建
// ============================================================

export function createGame(hostName: string, totalRounds: number = DEFAULT_TOTAL_ROUNDS): Game {
  const hostId = generateId();
  const game: Game = {
    id: generateId(),
    code: generateGameCode(),
    status: 'waiting',
    currentRound: 1,
    totalRounds,
    consumerDemand: generateConsumerDemand(totalRounds),
    players: [
      {
        id: hostId,
        name: hostName,
        role: null,
        connected: true,
      },
    ],
    hostId,
  };
  store.saveGame(game);
  return game;
}

export function joinGame(gameCode: string, playerName: string): { game: Game; player: Player } | { error: string } {
  const game = store.getGameByCode(gameCode);
  if (!game) {
    return { error: '游戏不存在，请检查房间号' };
  }
  if (game.status !== 'waiting') {
    return { error: '游戏已开始，无法加入' };
  }
  if (game.players.length >= 4) {
    return { error: '房间已满（最多 4 人）' };
  }

  const player: Player = {
    id: generateId(),
    name: playerName,
    role: null,
    connected: true,
  };
  store.addPlayerToGame(game.id, player);
  return { game, player };
}

export function selectRole(
  gameId: string,
  playerId: string,
  role: Role
): { game: Game } | { error: string } {
  const game = store.getGame(gameId);
  if (!game) {
    return { error: '游戏不存在' };
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    return { error: '玩家不在房间中' };
  }

  // Check if role is already taken
  const existing = game.players.find((p) => p.role === role && p.id !== playerId);
  if (existing) {
    return { error: '该角色已被选择' };
  }

  player.role = role;
  store.updatePlayerRole(playerId, role);
  return { game };
}

export function startGame(gameId: string): { game: Game; roundState: RoundState } | { error: string } {
  const game = store.getGame(gameId);
  if (!game) {
    return { error: '游戏不存在' };
  }
  if (game.players.length < 4) {
    return { error: '需要 4 名玩家才能开始' };
  }

  const unassigned = game.players.filter((p) => p.role === null);
  if (unassigned.length > 0) {
    return { error: '还有玩家未选择角色' };
  }

  game.status = 'active';
  store.saveGame(game);

  // Initialize round 1 state
  const roundState = createInitialRoundState(game);
  persistRoundState(game, roundState);

  return { game, roundState };
}

// ============================================================
// 回合处理
// ============================================================

function createInitialRoundState(game: Game): RoundState {
  const playerStates: Record<string, PlayerRoundState> = {};
  const consumerDemand = game.consumerDemand[0];

  for (const player of game.players) {
    if (!player.role) continue;
    playerStates[player.role] = {
      playerId: player.id,
      role: player.role,
      roundNumber: 1,
      incomingOrder: player.role === 'retailer' ? consumerDemand : 0,
      incomingShipment: 0,
      inventory: 12, // Start with 12 units of inventory
      backorder: 0,
      hasDecided: false,
      orderQuantity: null,
      holdingCost: 0,
      shortageCost: 0,
      roundCost: 0,
      cumulativeCost: 0,
    };
  }

  return {
    roundNumber: 1,
    playerStates: playerStates as Record<Role, PlayerRoundState>,
    allDecided: false,
    consumerDemand,
  };
}

function persistRoundState(game: Game, roundState: RoundState): void {
  for (const role of Object.keys(roundState.playerStates) as Role[]) {
    store.savePlayerRoundState(roundState.playerStates[role]);
  }

  store.addGameHistory(game.id, {
    roundNumber: roundState.roundNumber,
    consumerDemand: roundState.consumerDemand,
    playerStates: { ...roundState.playerStates },
  });
}

export function submitDecision(
  gameId: string,
  playerId: string,
  roundNumber: number,
  orderQuantity: number
): { roundState: RoundState } | { error: string } {
  const game = store.getGame(gameId);
  if (!game) {
    return { error: '游戏不存在' };
  }
  if (game.status !== 'active') {
    return { error: '游戏未在进行中' };
  }
  if (game.currentRound !== roundNumber) {
    return { error: '不是当前回合' };
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.role) {
    return { error: '无效的玩家' };
  }

  const state = store.getPlayerRoundState(playerId, roundNumber);
  if (!state) {
    return { error: '回合状态不存在' };
  }
  if (state.hasDecided) {
    return { error: '已提交过决策' };
  }

  state.hasDecided = true;
  state.orderQuantity = orderQuantity;
  store.savePlayerRoundState(state);

  // Check if all players have decided
  const allStates = store.getAllPlayerRoundStates(gameId, roundNumber);
  const allDecided = Object.values(allStates).every((s) => s.hasDecided);

  if (allDecided) {
    // Process the round!
    const nextRoundState = processRound(game, roundNumber);
    return { roundState: nextRoundState };
  }

  // Return current state with updated decision status
  const roundState: RoundState = {
    roundNumber,
    playerStates: allStates,
    allDecided: false,
    consumerDemand: game.consumerDemand[roundNumber - 1],
  };
  return { roundState };
}

function processRound(game: Game, roundNumber: number): RoundState {
  const players = game.players.filter((p) => p.role !== null) as (Player & { role: Role })[];

  // Step 1: Deliver shipments arriving this round
  for (const player of players) {
    const shipments = store.getArrivingShipments(player.id, roundNumber);
    const incomingShipment = shipments.reduce((sum, s) => sum + s.quantity, 0);
    store.markPipelineProcessed(shipments);

    const state = store.getPlayerRoundState(player.id, roundNumber);
    if (state) {
      state.incomingShipment = incomingShipment;
    }
  }

  // Step 2: Apply orders arriving this round
  for (const player of players) {
    const orders = store.getArrivingOrders(player.id, roundNumber);
    const incomingOrder = orders.reduce((sum, o) => sum + o.quantity, 0);
    store.markPipelineProcessed(orders);

    const state = store.getPlayerRoundState(player.id, roundNumber);
    if (state) {
      // Retailer gets consumer demand, others get orders from pipeline
      if (player.role === 'retailer') {
        state.incomingOrder = game.consumerDemand[roundNumber - 1];
      } else {
        state.incomingOrder = incomingOrder;
      }
    }
  }

  // Step 3: Fulfill downstream demand and calculate costs
  const prevRound = roundNumber > 1 ? store.getAllPlayerRoundStates(game.id, roundNumber - 1) : null;

  for (const player of players) {
    const state = store.getPlayerRoundState(player.id, roundNumber);
    if (!state) continue;

    const prevState = prevRound?.[player.role];
    const prevInventory = prevState?.inventory ?? 12;
    const prevBackorder = prevState?.backorder ?? 0;

    // Total available = previous inventory + incoming shipment
    const totalAvailable = prevInventory + state.incomingShipment;
    // Total demand = previous backorder + incoming order
    const totalDemand = prevBackorder + state.incomingOrder;

    // Fulfill what we can
    const fulfilled = Math.min(totalAvailable, totalDemand);
    const newBackorder = totalDemand - fulfilled;
    const newInventory = totalAvailable - fulfilled;

    state.inventory = newInventory;
    state.backorder = newBackorder;

    // Calculate costs
    state.holdingCost = newInventory * HOLDING_COST_PER_UNIT;
    state.shortageCost = newBackorder * SHORTAGE_COST_PER_UNIT;
    state.roundCost = state.holdingCost + state.shortageCost;
    state.cumulativeCost = (prevState?.cumulativeCost ?? 0) + state.roundCost;

    store.savePlayerRoundState(state);
  }

  // Step 4: Place new orders into pipeline
  for (const player of players) {
    const state = store.getPlayerRoundState(player.id, roundNumber);
    if (!state || state.orderQuantity === null) continue;

    const upstreamRole = UPSTREAM_MAP[player.role];
    if (upstreamRole) {
      const upstreamPlayer = players.find((p) => p.role === upstreamRole);
      if (upstreamPlayer) {
        store.addOrderPipeline({
          fromPlayerId: player.id,
          toPlayerId: upstreamPlayer.id,
          roundPlaced: roundNumber,
          roundArrives: roundNumber + ORDER_DELAY_ROUNDS,
          quantity: state.orderQuantity,
          processed: false,
        });
      }
    }

    // Ship to downstream (what was fulfilled from incoming order)
    const downstreamRole = DOWNSTREAM_MAP[player.role];
    if (downstreamRole) {
      const downstreamPlayer = players.find((p) => p.role === downstreamRole);
      if (downstreamPlayer) {
        const prevBackorder = prevRound?.[player.role]?.backorder ?? 0;
        const fulfilled = Math.min(
          (prevRound?.[player.role]?.inventory ?? 12) + state.incomingShipment,
          prevBackorder + state.incomingOrder
        );
        store.addShipmentPipeline({
          fromPlayerId: player.id,
          toPlayerId: downstreamPlayer.id,
          roundPlaced: roundNumber,
          roundArrives: roundNumber + SHIPMENT_DELAY_ROUNDS,
          quantity: fulfilled,
          processed: false,
        });
      }
    }
  }

  // Step 5: Factory produces its order quantity (ships to distributor)
  const factory = players.find((p) => p.role === 'factory');
  if (factory) {
    const factoryState = store.getPlayerRoundState(factory.id, roundNumber);
    if (factoryState && factoryState.orderQuantity !== null) {
      const distributor = players.find((p) => p.role === 'distributor');
      if (distributor) {
        store.addShipmentPipeline({
          fromPlayerId: factory.id,
          toPlayerId: distributor.id,
          roundPlaced: roundNumber,
          roundArrives: roundNumber + SHIPMENT_DELAY_ROUNDS,
          quantity: factoryState.orderQuantity,
          processed: false,
        });
      }
    }
  }

  // Step 6: Create next round state
  const nextRound = roundNumber + 1;
  game.currentRound = nextRound;
  store.saveGame(game);

  // Check if game is over
  if (nextRound > game.totalRounds) {
    game.status = 'finished';
    store.saveGame(game);
    const nextRoundState = createFinalRoundState(game, roundNumber);
    persistRoundState(game, nextRoundState);
    return nextRoundState;
  }

  const nextConsumerDemand = game.consumerDemand[nextRound - 1];
  const nextPlayerStates: Record<string, PlayerRoundState> = {};

  for (const player of players) {
    const prevState = store.getPlayerRoundState(player.id, roundNumber);
    nextPlayerStates[player.role] = {
      playerId: player.id,
      role: player.role,
      roundNumber: nextRound,
      incomingOrder: 0, // Will be filled when round processes
      incomingShipment: 0, // Will be filled when round processes
      inventory: prevState?.inventory ?? 12,
      backorder: prevState?.backorder ?? 0,
      hasDecided: false,
      orderQuantity: null,
      holdingCost: 0,
      shortageCost: 0,
      roundCost: 0,
      cumulativeCost: prevState?.cumulativeCost ?? 0,
    };
  }

  const nextRoundState: RoundState = {
    roundNumber: nextRound,
    playerStates: nextPlayerStates as Record<Role, PlayerRoundState>,
    allDecided: false,
    consumerDemand: nextConsumerDemand,
  };

  persistRoundState(game, nextRoundState);
  return nextRoundState;
}

function createFinalRoundState(game: Game, lastRound: number): RoundState {
  const players = game.players.filter((p) => p.role !== null) as (Player & { role: Role })[];
  const playerStates: Record<string, PlayerRoundState> = {};

  for (const player of players) {
    const state = store.getPlayerRoundState(player.id, lastRound);
    playerStates[player.role] = {
      playerId: player.id,
      role: player.role,
      roundNumber: lastRound,
      incomingOrder: state?.incomingOrder ?? 0,
      incomingShipment: state?.incomingShipment ?? 0,
      inventory: state?.inventory ?? 0,
      backorder: state?.backorder ?? 0,
      hasDecided: true,
      orderQuantity: state?.orderQuantity ?? null,
      holdingCost: state?.holdingCost ?? 0,
      shortageCost: state?.shortageCost ?? 0,
      roundCost: state?.roundCost ?? 0,
      cumulativeCost: state?.cumulativeCost ?? 0,
    };
  }

  return {
    roundNumber: lastRound,
    playerStates: playerStates as Record<Role, PlayerRoundState>,
    allDecided: true,
    consumerDemand: game.consumerDemand[lastRound - 1],
  };
}