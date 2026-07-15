<template>
  <div class="card player-panel">
    <h3>我的状态 — {{ roleLabel }}</h3>
    <div v-if="playerState" class="stats-grid mt-1">
      <div class="stat-item">
        <div class="stat-label">当前库存</div>
        <div class="stat-value">{{ playerState.inventory }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">缺货量</div>
        <div class="stat-value" :class="{ negative: playerState.backorder > 0 }">
          {{ playerState.backorder }}
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label">收到订单</div>
        <div class="stat-value">{{ playerState.incomingOrder }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">收到货物</div>
        <div class="stat-value">{{ playerState.incomingShipment }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">本回合成本</div>
        <div class="stat-value" :class="{ negative: playerState.roundCost > 0 }">
          ${{ playerState.roundCost }}
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label">累计成本</div>
        <div class="stat-value" :class="{ negative: playerState.cumulativeCost > 0 }">
          ${{ playerState.cumulativeCost }}
        </div>
      </div>
    </div>
    <div v-else class="text-center mt-2">
      <p>等待游戏数据...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { ROLE_LABELS } from '@beer-game/shared';

const gameStore = useGameStore();

const playerState = computed(() => gameStore.myPlayerState);
const roleLabel = computed(() => {
  if (!gameStore.myRole) return '';
  return ROLE_LABELS[gameStore.myRole];
});
</script>

<style scoped>
.player-panel h3 {
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  padding: 10px;
  background: var(--color-bg);
  border-radius: var(--radius);
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-value.negative {
  color: var(--color-danger);
}
</style>