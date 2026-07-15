import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerLobbyHandlers } from './handlers/lobby.js';
import { registerGameHandlers } from './handlers/game.js';
import * as store from './store.js';

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  console.error('FATAL - uncaughtException:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('FATAL - unhandledRejection:', reason);
});

console.log('Starting server...');
console.log('Node version:', process.version);
console.log('CWD:', process.cwd());
console.log('PORT env:', process.env.PORT);

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all games (for dashboard)
app.get('/api/games', (_req, res) => {
  const allGames = store.listAllGames();
  const summaries = allGames.map((g) => {
    const result = g.status === 'finished' ? store.computeGameResult(g.id) : null;
    return {
      id: g.id,
      code: g.code,
      status: g.status,
      currentRound: g.currentRound,
      totalRounds: g.totalRounds,
      playerCount: g.players.length,
      players: g.players.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        connected: p.connected,
      })),
      result,
    };
  });
  res.json(summaries);
});

// Dashboard namespace for real-time updates
io.of('/dashboard').on('connection', (socket) => {
  console.log(`Dashboard connected: ${socket.id}`);

  // Send initial game list
  const allGames = store.listAllGames();
  const summaries = buildGameSummaries(allGames);
  socket.emit('dashboard:update', summaries);

  // Broadcast updates on a 2-second interval for active games
  const interval = setInterval(() => {
    if (socket.disconnected) {
      clearInterval(interval);
      return;
    }
    const games = store.listAllGames();
    socket.emit('dashboard:update', buildGameSummaries(games));
  }, 2000);

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log(`Dashboard disconnected: ${socket.id}`);
  });
});

// Also broadcast dashboard updates after lobby/game events
function broadcastDashboardUpdate() {
  const games = store.listAllGames();
  io.of('/dashboard').emit('dashboard:update', buildGameSummaries(games));
}

function buildGameSummaries(allGames: Array<ReturnType<typeof store.getGame>>) {
  return allGames
    .filter((g): g is NonNullable<typeof g> => g !== undefined)
    .map((g) => {
      const result = g.status === 'finished' ? store.computeGameResult(g.id) : null;
      return {
        id: g.id,
        code: g.code,
        status: g.status,
        currentRound: g.currentRound,
        totalRounds: g.totalRounds,
        playerCount: g.players.length,
        players: g.players.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          connected: p.connected,
        })),
        result,
      };
    });
}

// Socket.IO connection (game namespace)
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  registerLobbyHandlers(socket, broadcastDashboardUpdate);
  registerGameHandlers(socket, broadcastDashboardUpdate);
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// Serve static frontend files in production
const distPath = resolve(__dirname, '../../client/dist');
app.use(express.static(distPath));
// SPA fallback: all non-API routes go to index.html
app.get(/^\/(?!api|socket\.io)/, (_req, res) => {
  const indexPath = resolve(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<!DOCTYPE html><html><body><h1>前端未构建</h1><p>请运行 npm run build:client</p></body></html>');
  }
});
console.log(`Static files path: ${distPath}, exists: ${existsSync(distPath)}`);

httpServer.listen(PORT, () => {
  console.log(`Beer Game server running on http://localhost:${PORT}`);
});