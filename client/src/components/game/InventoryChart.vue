<template>
  <div class="card chart-container">
    <h3>库存与缺货趋势</h3>
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

const history = ref<{ round: number; inventory: number; backorder: number }[]>([]);

// Track history manually since we don't have a full history store on the client
on('game:state', (state: unknown) => {
  const s = state as RoundState;
  const ps = gameStore.myRole ? s.playerStates[gameStore.myRole] : null;
  if (ps) {
    // Update or add to history
    const existing = history.value.find((h) => h.round === s.roundNumber);
    if (existing) {
      existing.inventory = ps.inventory;
      existing.backorder = ps.backorder;
    } else {
      history.value.push({
        round: s.roundNumber,
        inventory: ps.inventory,
        backorder: ps.backorder,
      });
    }
  }
});

on('game:round_processed', (state: unknown) => {
  const s = state as RoundState;
  const ps = gameStore.myRole ? s.playerStates[gameStore.myRole] : null;
  if (ps) {
    const existing = history.value.find((h) => h.round === s.roundNumber);
    if (existing) {
      existing.inventory = ps.inventory;
      existing.backorder = ps.backorder;
    } else {
      history.value.push({
        round: s.roundNumber,
        inventory: ps.inventory,
        backorder: ps.backorder,
      });
    }
  }
});

const chartData = computed(() => {
  if (history.value.length === 0) return null;
  return {
    labels: history.value.map((h) => `R${h.round}`),
    datasets: [
      {
        label: '库存',
        data: history.value.map((h) => h.inventory),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: '缺货',
        data: history.value.map((h) => h.backorder),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
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
        text: '单位',
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