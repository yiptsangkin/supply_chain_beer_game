<template>
  <div class="card round-status">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2>第 {{ gameStore.roundState?.roundNumber }} / {{ gameStore.currentGame?.totalRounds }} 回合</h2>
        <span v-if="gameStore.hasDecided" class="badge badge-decided">已提交</span>
        <span v-else class="badge badge-pending">待决策</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="demand-info">
          消费者需求: <strong>{{ gameStore.roundState?.consumerDemand }}</strong>
        </div>
        <div v-if="gameStore.allDecided" class="status-text status-processing">
          所有玩家已提交，正在处理...
        </div>
        <div v-else class="status-text">
          {{ decidedCount }} / 4 玩家已提交
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();

const decidedCount = computed(() => {
  if (!gameStore.roundState) return 0;
  return Object.values(gameStore.roundState.playerStates).filter((s) => s.hasDecided).length;
});
</script>

<style scoped>
.round-status {
  padding: 16px 24px;
}

.badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-decided {
  background: #dcfce7;
  color: #15803d;
}

.badge-pending {
  background: #fef3c7;
  color: #b45309;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.demand-info {
  font-size: 14px;
  color: var(--color-text-muted);
}

.status-text {
  font-size: 13px;
  color: var(--color-text-muted);
}

.status-processing {
  color: var(--color-primary);
  font-weight: 500;
}
</style>