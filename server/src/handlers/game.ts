import type { Socket } from 'socket.io';
import * as gameLogic from '../game-logic.js';
import * as store from '../store.js';

export function registerGameHandlers(socket: Socket, onUpdate?: () => void): void {
  // Submit round decision
  socket.on('round:decide', (data: { gameId: string; playerId: string; roundNumber: number; orderQuantity: number }) => {
    try {
      const result = gameLogic.submitDecision(
        data.gameId,
        data.playerId,
        data.roundNumber,
        data.orderQuantity
      );

      if ('error' in result) {
        socket.emit('error', { message: result.error, code: 'DECIDE_FAILED' });
        return;
      }

      const { roundState } = result;

      if (roundState.allDecided) {
        // Round was processed, check if game is finished
        const game = store.getGame(data.gameId);
        if (game?.status === 'finished') {
          const gameResult = store.computeGameResult(data.gameId);
          socket.nsp.to(data.gameId).emit('game:round_processed', roundState);
          socket.nsp.to(data.gameId).emit('game:finished', gameResult);
          onUpdate?.();
          return;
        }

        // Broadcast new round state to all players
        socket.nsp.to(data.gameId).emit('game:round_processed', roundState);
      } else {
        // Just update the player who submitted
        socket.emit('game:state', roundState);
      }
      onUpdate?.();
    } catch (err) {
      socket.emit('error', { message: '提交决策失败', code: 'DECIDE_FAILED' });
    }
  });

  // Request current game state (for reconnection)
  socket.on('round:request_state', (data: { gameId: string }) => {
    const game = store.getGame(data.gameId);
    if (!game) {
      socket.emit('error', { message: '游戏不存在', code: 'GAME_NOT_FOUND' });
      return;
    }

    const allStates = store.getAllPlayerRoundStates(data.gameId, game.currentRound);
    const roundState = {
      roundNumber: game.currentRound,
      playerStates: allStates,
      allDecided: Object.values(allStates).every((s) => s.hasDecided),
      consumerDemand: game.consumerDemand[game.currentRound - 1] ?? 0,
    };
    socket.emit('game:state', roundState);
  });

  // Handle reconnection
  socket.on('player:reconnect', (data: { gameId: string; playerId: string }) => {
    const game = store.getGame(data.gameId);
    if (!game) return;

    const player = game.players.find((p) => p.id === data.playerId);
    if (player) {
      player.connected = true;
      socket.join(data.gameId);
      socket.data.gameId = data.gameId;
      socket.data.playerId = data.playerId;

      socket.to(data.gameId).emit('player:reconnected', data.playerId);
      socket.to(data.gameId).emit('lobby:updated', game);

      // Send current game state
      if (game.status === 'active') {
        const allStates = store.getAllPlayerRoundStates(data.gameId, game.currentRound);
        socket.emit('game:state', {
          roundNumber: game.currentRound,
          playerStates: allStates,
          allDecided: Object.values(allStates).every((s) => s.hasDecided),
          consumerDemand: game.consumerDemand[game.currentRound - 1] ?? 0,
        });
      } else if (game.status === 'finished') {
        const gameResult = store.computeGameResult(data.gameId);
        socket.emit('game:finished', gameResult);
      } else {
        socket.emit('lobby:updated', game);
      }
    }
  });
}