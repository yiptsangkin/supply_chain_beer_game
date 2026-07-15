<template>
  <div class="card chart-container">
    <h3>成本趋势</h3>
    <div class="chart-wrapper">
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
      <p v-else class="no-data">等待数据...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
import { useGameStore } from '@/stores/game';
import { useSocket } from '@/composables/useSocket';
import type { RoundState } from '@beer-game/shared';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const gameStore = useGameStore();
const { on } = useSocket();

const history = ref<{ round: number; cumulativeCost: number; roundCost: number }[]>([]);

function updateHistory(s: RoundState) {
  const ps = gameStore.myRole ? s.playerStates[gameStore.myRole] : null;
  if (ps) {
    const existing = history.value.find((h) => h.round === s.roundNumber);
    if (existing) {
      existing.cumulativeCost = ps.cumulativeCost;
      existing.roundCost = ps.roundCost;
    } else {
      history.value.push({
        round: s.roundNumber,
        cumulativeCost: ps.cumulativeCost,
        roundCost: ps.roundCost,
      });
    }
  }
}

on('game:state', (data: any) => updateHistory(data as RoundState));
on('game:round_processed', (data: any) => updateHistory(data as RoundState));

const chartData = computed(() => {
  if (history.value.length === 0) return null;
  return {
    labels: history.value.map((h) => `R${h.round}`),
    datasets: [
      {
        label: '累计成本',
        data: history.value.map((h) => h.cumulativeCost),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: '回合成本',
        data: history.value.map((h) => h.roundCost),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
});

const chartOptions = {
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
        text: '美元 ($)',
      },
    },
  },
};
</script>

<style scoped>
.chart-container h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.chart-wrapper {
  height: 250px;
  position: relative;
}

.no-data {
  text-align: center;
  color: var(--color-text-muted);
  padding: 40px 0;
}
</style>