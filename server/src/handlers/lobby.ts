import type { Socket } from 'socket.io';
import type { Role } from '@beer-game/shared';
import * as gameLogic from '../game-logic.js';
import * as store from '../store.js';

export function registerLobbyHandlers(socket: Socket, onUpdate?: () => void): void {
  // Create game
  socket.on('lobby:create', (data: { playerName: string; totalRounds?: number }) => {
    try {
      const game = gameLogic.createGame(data.playerName, data.totalRounds);
      socket.join(game.id);
      socket.data.gameId = game.id;
      socket.data.playerId = game.players[0].id;
      socket.emit('lobby:updated', game);
      onUpdate?.();
    } catch (err) {
      socket.emit('error', { message: '创建游戏失败', code: 'CREATE_FAILED' });
    }
  });

  // Join game
  socket.on('lobby:join', (data: { gameCode: string; playerName: string }) => {
    try {
      const result = gameLogic.joinGame(data.gameCode, data.playerName);
      if ('error' in result) {
        socket.emit('error', { message: result.error, code: 'JOIN_FAILED' });
        return;
      }

      const { game, player } = result;
      socket.join(game.id);
      socket.data.gameId = game.id;
      socket.data.playerId = player.id;

      // Notify everyone in the room
      socket.emit('lobby:updated', game);
      socket.to(game.id).emit('player:joined', player);
      socket.to(game.id).emit('lobby:updated', game);
      onUpdate?.();
    } catch (err) {
      socket.emit('error', { message: '加入游戏失败', code: 'JOIN_FAILED' });
    }
  });

  // Select role
  socket.on('lobby:select_role', (data: { gameId: string; role: Role }) => {
    try {
      const playerId = socket.data.playerId;
      if (!playerId) {
        socket.emit('error', { message: '未加入游戏', code: 'NOT_IN_GAME' });
        return;
      }

      const result = gameLogic.selectRole(data.gameId, playerId, data.role);
      if ('error' in result) {
        socket.emit('error', { message: result.error, code: 'ROLE_FAILED' });
        return;
      }

      // Broadcast updated game state to room
      socket.emit('lobby:updated', result.game);
      socket.to(data.gameId).emit('lobby:updated', result.game);
      onUpdate?.();
    } catch (err) {
      socket.emit('error', { message: '选择角色失败', code: 'ROLE_FAILED' });
    }
  });

  // Start game
  socket.on('lobby:start_game', (data: { gameId: string }) => {
    try {
      const result = gameLogic.startGame(data.gameId);
      if ('error' in result) {
        socket.emit('error', { message: result.error, code: 'START_FAILED' });
        return;
      }

      const { game, roundState } = result;

      // Broadcast game started and initial state to all players in room
      socket.nsp.to(data.gameId).emit('game:started', game);
      socket.nsp.to(data.gameId).emit('game:state', roundState);
      onUpdate?.();
    } catch (err) {
      socket.emit('error', { message: '开始游戏失败', code: 'START_FAILED' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const gameId = socket.data.gameId;
    const playerId = socket.data.playerId;
    if (gameId && playerId) {
      const game = store.getGame(gameId);
      if (game) {
        const player = game.players.find((p) => p.id === playerId);
        if (player) {
          player.connected = false;
        }
        socket.to(gameId).emit('player:left', playerId);
        socket.to(gameId).emit('lobby:updated', game);
        onUpdate?.();
      }
    }
  });
}