<template>
  <div class="result-page">
    <div v-if="gameStore.gameResult" class="card" style="max-width: 800px; margin: 0 auto;">
      <h2 class="text-center">🏆 游戏结束</h2>
      <p class="text-center subtitle mt-1">
        共完成 {{ gameStore.gameResult.totalRounds }} 回合
      </p>

      <!-- Rankings -->
      <div class="rankings mt-3">
        <div
          v-for="player in gameStore.gameResult.players"
          :key="player.playerId"
          class="rank-card"
          :class="{
            'rank-1': player.rank === 1,
            'is-me': player.playerId === authStore.playerId,
          }"
        >
          <div class="rank-number">#{{ player.rank }}</div>
          <div class="rank-info">
            <div class="rank-name">
              {{ player.name }}
              <span v-if="player.playerId === authStore.playerId" class="me-badge">我</span>
            </div>
            <div class="rank-role">{{ roleLabels[player.role] }}</div>
          </div>
          <div class="rank-costs">
            <div class="cost-item">
              <span class="cost-label">持有成本</span>
              <span>${{ player.totalHoldingCost }}</span>
            </div>
            <div class="cost-item">
              <span class="cost-label">缺货成本</span>
              <span>${{ player.totalShortageCost }}</span>
            </div>
            <div class="cost-item total">
              <span class="cost-label">总成本</span>
              <strong>${{ player.totalCost }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Demand chart -->
      <div class="mt-3">
        <h3>消费者需求变化</h3>
        <div class="chart-wrapper">
          <Line v-if="demandChartData" :data="demandChartData" :options="demandChartOptions" />
        </div>
      </div>

      <div class="text-center mt-3">
        <router-link to="/" class="btn btn-primary btn-lg">
          返回首页
        </router-link>
      </div>
    </div>

    <div v-else class="text-center mt-4">
      <p>加载结果中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { ROLE_LABELS } from '@beer-game/shared';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const authStore = useAuthStore();
const gameStore = useGameStore();
const roleLabels = ROLE_LABELS;

const demandChartData = computed(() => {
  const result = gameStore.gameResult;
  if (!result) return null;
  return {
    labels: result.consumerDemand.map((_, i) => `R${i + 1}`),
    datasets: [
      {
        label: '消费者需求',
        data: result.consumerDemand,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.1,
        stepped: true,
      },
    ],
  };
});

const demandChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: '单位',
      },
    },
  },
};
</script>

<style scoped>
.subtitle {
  color: var(--color-text-muted);
  font-size: 15px;
}

.rankings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg);
  border-radius: var(--radius);
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.rank-card.is-me {
  border-color: var(--color-primary);
  background: #eff6ff;
}

.rank-card.rank-1 {
  border-color: #f59e0b;
  background: #fffbeb;
}

.rank-number {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-muted);
  min-width: 50px;
  text-align: center;
}

.rank-1 .rank-number {
  color: #f59e0b;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-size: 16px;
  font-weight: 600;
}

.me-badge {
  font-size: 11px;
  background: var(--color-primary);
  color: white;
  padding: 1px 6px;
  border-radius: 10px;
}

.rank-role {
  font-size: 13px;
  color: var(--color-text-muted);
}

.rank-costs {
  display: flex;
  gap: 16px;
}

.cost-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 14px;
}

.cost-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.cost-item.total {
  font-size: 16px;
}

.chart-wrapper {
  height: 200px;
  position: relative;
  margin-top: 8px;
}
</style>