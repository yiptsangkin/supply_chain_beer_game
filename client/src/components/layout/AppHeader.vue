<template>
  <header class="header">
    <div class="container flex items-center justify-between">
      <router-link to="/" class="logo">
        🍺 啤酒游戏
      </router-link>
      <div class="header-right">
        <span v-if="gameStore.currentGame?.code" class="game-code">
          房间号: <strong>{{ gameStore.currentGame.code }}</strong>
        </span>
        <span v-if="gameStore.myRole" class="role-badge" :class="roleClass">
          {{ roleLabel }}
        </span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { ROLE_LABELS } from '@beer-game/shared';

const gameStore = useGameStore();

const roleLabel = computed(() => {
  if (!gameStore.myRole) return '';
  return ROLE_LABELS[gameStore.myRole];
});

const roleClass = computed(() => {
  return gameStore.myRole ?? '';
});
</script>

<style scoped>
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 12px 0;
  box-shadow: var(--shadow);
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-code {
  font-size: 14px;
  color: var(--color-text-muted);
}

.role-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.role-badge.retailer { background: #dbeafe; color: #1d4ed8; }
.role-badge.wholesaler { background: #dcfce7; color: #15803d; }
.role-badge.distributor { background: #fef3c7; color: #b45309; }
.role-badge.factory { background: #fce7f3; color: #9d174d; }
</style>