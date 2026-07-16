<template>
  <div class="dashboard-page">
    <h1 class="dashboard-title">📊 总控看板</h1>
    <p class="subtitle">实时监控所有小组的啤酒游戏状态</p>

    <!-- Stats summary -->
    <div class="stats-bar mt-2">
      <div class="stat-card">
        <div class="stat-number">{{ activeGames }}</div>
        <div class="stat-label">进行中</div>
      </div>
      <div class="stat-card waiting">
        <div class="stat-number">{{ waitingGames }}</div>
        <div class="stat-label">等待中</div>
      </div>
      <div class="stat-card finished">
        <div class="stat-number">{{ finishedGames }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ totalPlayers }}</div>
        <div class="stat-label">总玩家</div>
      </div>
    </div>

    <!-- No games -->
    <div v-if="games.length === 0" class="card text-center mt-3">
      <p class="empty-text">暂无游戏房间</p>
      <p class="hint">创建房间后，这里会实时显示各小组的数据</p>
    </div>

    <!-- Game cards -->
    <div class="games-grid mt-3">
      <div
        v-for="game in games"
        :key="game.id"
        class="card game-card"
        :class="'status-' + game.status"
      >
        <!-- Header -->
        <div class="game-header">
          <div class="flex items-center justify-between">
            <h3>
              <span class="status-dot" :class="'dot-' + game.status"></span>
              小组 {{ game.code }}
            </h3>
            <span class="status-tag" :class="'tag-' + game.status">
              {{ statusLabel(game.status) }}
            </span>
          </div>
          <div class="game-meta">
            <span>{{ game.playerCount }}/4 人</span>
            <span v-if="game.status === 'active'">
              第 {{ game.currentRound }}/{{ game.totalRounds }} 回合
            </span>
            <span v-if="game.status === 'finished'">
              共 {{ game.totalRounds }} 回合
            </span>
          </div>
        </div>

        <!-- Players -->
        <div class="players-row mt-1">
          <div
            v-for="role in roleOrder"
            :key="role"
            class="player-mini"
            :class="{ filled: getPlayer(game, role) }"
          >
            <div class="role-tag">{{ roleLabels[role] }}</div>
            <div class="player-name">
              {{ getPlayer(game, role)?.name || '—' }}
            </div>
          </div>
        </div>

        <!-- Active game: progress bar -->
        <div v-if="game.status === 'active'" class="mt-2">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progressPercent(game) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Finished game: rankings -->
        <div v-if="game.status === 'finished' && game.result" class="rankings mt-2">
          <div
            v-for="p in game.result.players"
            :key="p.playerId"
            class="rank-row"
            :class="{ 'rank-first': p.rank === 1 }"
          >
            <span class="rank-num">#{{ p.rank }}</span>
            <span class="rank-name">{{ p.name }}</span>
            <span class="rank-role">{{ roleLabels[p.role] }}</span>
            <span class="rank-cost">${{ p.totalCost }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison chart (finished games) -->
    <div v-if="finishedGames > 1" class="card mt-3">
      <h3>各小组成本对比</h3>
      <div class="chart-wrapper">
        <Bar v-if="comparisonChartData" :data="comparisonChartData" :options="comparisonOptions" />
      </div>
    </div>

    <div class="text-center mt-3">
      <router-link to="/" class="btn btn-outline">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '@/config';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ROLES, ROLE_LABELS } from '@beer-game/shared';
import type { Role } from '@beer-game/shared';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface GameSummary {
  id: string;
  code: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  playerCount: number;
  players: Array<{ id: string; name: string; role: string | null; connected: boolean }>;
  result: {
    gameId: string;
    players: Array<{
      playerId: string;
      name: string;
      role: Role;
      totalHoldingCost: number;
      totalShortageCost: number;
      totalCost: number;
      rank: number;
    }>;
  } | null;
}

const roleOrder = ROLES;
const roleLabels = ROLE_LABELS;
const games = ref<GameSummary[]>([]);
let dashboardSocket: Socket | null = null;

const activeGames = computed(() => games.value.filter((g) => g.status === 'active').length);
const waitingGames = computed(() => games.value.filter((g) => g.status === 'waiting').length);
const finishedGames = computed(() => games.value.filter((g) => g.status === 'finished').length);
const totalPlayers = computed(() => games.value.reduce((sum, g) => sum + g.playerCount, 0));

function statusLabel(status: string): string {
  const map: Record<string, string> = { waiting: '等待中', active: '进行中', finished: '已结束' };
  return map[status] || status;
}

function getPlayer(game: GameSummary, role: string) {
  return game.players.find((p) => p.role === role);
}

function progressPercent(game: GameSummary): number {
  return Math.round((game.currentRound / game.totalRounds) * 100);
}

// Comparison chart for finished games
const comparisonChartData = computed(() => {
  const finished = games.value.filter((g) => g.status === 'finished' && g.result);
  if (finished.length < 2) return null;

  const datasets = finished.map((g, i) => {
    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899'];
    const color = colors[i % colors.length];
    return {
      label: '小组 ' + g.code,
      data: g.result!.players.map((p) => p.totalCost),
      backgroundColor: color + '99',
      borderColor: color,
      borderWidth: 1,
    };
  });

  return {
    labels: ROLES.map((r) => roleLabels[r]),
    datasets,
  };
});

const comparisonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: { display: true, text: '总成本 ($)' },
    },
    x: {
      title: { display: true, text: '角色' },
    },
  },
};

onMounted(() => {
  dashboardSocket = io(SERVER_URL + '/dashboard', {
    transports: ['polling'],
  });

  dashboardSocket.on('dashboard:update', (data: GameSummary[]) => {
    games.value = data;
  });
});

onUnmounted(() => {
  dashboardSocket?.disconnect();
});
</script>

<style scoped>
.dashboard-title {
  font-size: 28px;
  font-weight: 800;
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 14px;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 20px;
  background: var(--color-surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  text-align: center;
}

.stat-card.waiting {
  border-left: 3px solid #f59e0b;
}

.stat-card.finished {
  border-left: 3px solid #16a34a;
}

.stat-number {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-primary);
}

.waiting .stat-number { color: #f59e0b; }
.finished .stat-number { color: #16a34a; }

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

.game-card {
  transition: border-color 0.2s;
}

.game-card.status-active {
  border-left: 4px solid var(--color-primary);
}

.game-card.status-waiting {
  border-left: 4px solid #f59e0b;
}

.game-card.status-finished {
  border-left: 4px solid #16a34a;
}

.game-header h3 {
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot-waiting { background: #f59e0b; }
.dot-active { background: var(--color-primary); animation: pulse 1.5s ease-in-out infinite; }
.dot-finished { background: #16a34a; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.tag-waiting { background: #fef3c7; color: #b45309; }
.tag-active { background: #dbeafe; color: #1d4ed8; }
.tag-finished { background: #dcfce7; color: #15803d; }

.game-meta {
  font-size: 13px;
  color: var(--color-text-muted);
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.players-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.player-mini {
  padding: 8px;
  background: var(--color-bg);
  border-radius: 4px;
  text-align: center;
  opacity: 0.5;
}

.player-mini.filled {
  opacity: 1;
}

.role-tag {
  font-size: 10px;
  color: var(--color-text-muted);
}

.player-mini .player-name {
  font-size: 13px;
  font-weight: 500;
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.rankings {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.rank-row.rank-first {
  background: #fffbeb;
  font-weight: 600;
}

.rank-num {
  font-weight: 700;
  min-width: 24px;
}

.rank-first .rank-num {
  color: #f59e0b;
}

.rank-name {
  flex: 1;
}

.rank-role {
  color: var(--color-text-muted);
  font-size: 12px;
}

.rank-cost {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.chart-wrapper {
  height: 300px;
  position: relative;
  margin-top: 12px;
}

.empty-text {
  font-size: 18px;
  color: var(--color-text-muted);
  padding: 40px 0 8px;
}

.hint {
  font-size: 14px;
  color: var(--color-text-muted);
  padding-bottom: 20px;
}
</style>