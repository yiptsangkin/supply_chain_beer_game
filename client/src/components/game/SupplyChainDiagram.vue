<template>
  <div class="card supply-chain">
    <div class="chain">
      <div class="chain-label">消费者</div>
      <div class="chain-arrow">→</div>
      <div
        v-for="role in ROLES"
        :key="role"
        class="chain-node"
        :class="{ 'is-me': gameStore.myRole === role }"
      >
        <div class="node-role">{{ ROLE_LABELS[role] }}</div>
        <div class="node-name">{{ getPlayerName(role) }}</div>
        <div class="node-stats" v-if="getPlayerState(role)">
          <span class="stat">
            库存: <strong>{{ getPlayerState(role)?.inventory }}</strong>
          </span>
          <span class="stat" v-if="getPlayerState(role)?.backorder">
            缺货: <strong class="text-danger">{{ getPlayerState(role)?.backorder }}</strong>
          </span>
        </div>
        <div class="node-decision" v-if="getPlayerState(role)?.hasDecided">
          ✓ 已决策
        </div>
        <div class="node-decision waiting" v-else>
          ⏳ 等待中
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { ROLES, ROLE_LABELS } from '@beer-game/shared';
import type { Role } from '@beer-game/shared';

const gameStore = useGameStore();

function getPlayerName(role: Role): string {
  const player = gameStore.currentGame?.players.find((p) => p.role === role);
  return player?.name ?? '—';
}

function getPlayerState(role: Role) {
  return gameStore.roundState?.playerStates[role];
}
</script>

<style scoped>
.supply-chain {
  padding: 20px;
  overflow-x: auto;
}

.chain {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 700px;
  justify-content: center;
}

.chain-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.chain-arrow {
  font-size: 20px;
  color: var(--color-text-muted);
}

.chain-node {
  flex: 1;
  max-width: 160px;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  text-align: center;
  background: var(--color-bg);
  transition: border-color 0.2s;
}

.chain-node.is-me {
  border-color: var(--color-primary);
  background: #eff6ff;
  box-shadow: var(--shadow-md);
}

.node-role {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.node-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.node-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.stat {
  color: var(--color-text-muted);
}

.text-danger {
  color: var(--color-danger);
}

.node-decision {
  font-size: 11px;
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  background: #dcfce7;
  color: #15803d;
}

.node-decision.waiting {
  background: #f1f5f9;
  color: var(--color-text-muted);
}
</style>