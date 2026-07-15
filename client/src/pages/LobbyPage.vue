<template>
  <div class="lobby-page">
    <div v-if="gameStore.currentGame" class="card" style="max-width: 640px; margin: 0 auto;">
      <div class="flex items-center justify-between mb-2">
        <h2>等待室</h2>
        <div class="game-code-display">
          房间号: <strong>{{ gameStore.currentGame.code }}</strong>
        </div>
      </div>

      <p class="subtitle">邀请朋友加入房间，选择角色后开始游戏</p>

      <div class="players-grid mt-2">
        <div
          v-for="role in allRoles"
          :key="role"
          class="player-slot"
          :class="{
            selected: playersByRole[role],
            'is-me': playersByRole[role]?.id === authStore.playerId,
          }"
        >
          <div class="role-label">{{ roleLabels[role] }}</div>
          <div v-if="playersByRole[role]" class="player-name">
            {{ playersByRole[role]?.name }}
            <span v-if="playersByRole[role]?.id === authStore.playerId" class="me-badge">我</span>
          </div>
          <div v-else class="empty-slot">空位</div>
          <button
            v-if="!playersByRole[role]"
            class="btn btn-outline btn-sm mt-1"
            @click="selectRole(role)"
            :disabled="!!gameStore.myRole"
          >
            选择此角色
          </button>
          <button
            v-if="playersByRole[role]?.id === authStore.playerId"
            class="btn btn-outline btn-sm mt-1"
            @click="selectRole(role)"
          >
            更换角色
          </button>
        </div>
      </div>

      <div v-if="error" class="error-text mt-2">{{ error }}</div>

      <div class="lobby-actions mt-3 text-center">
        <button
          v-if="gameStore.isHost"
          class="btn btn-success btn-lg"
          :disabled="!canStart"
          @click="startGame"
        >
          {{ canStart ? '开始游戏' : `等待玩家加入... (${playerCount}/4)` }}
        </button>
        <p v-else class="waiting-text">等待房主开始游戏...</p>
      </div>

      <router-link to="/" class="btn btn-outline mt-2" style="width: 100%; display: block; text-align: center;">
        离开房间
      </router-link>
    </div>

    <div v-else class="text-center mt-4">
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { ROLES, ROLE_LABELS } from '@beer-game/shared';
import type { Role, Game, Player, RoundState } from '@beer-game/shared';

const router = useRouter();
const { emit, on, off } = useSocket();
const authStore = useAuthStore();
const gameStore = useGameStore();

const allRoles = ROLES;
const roleLabels = ROLE_LABELS;
const error = ref('');

const playersByRole = computed(() => {
  const map: Record<string, Player | undefined> = {};
  for (const role of ROLES) {
    map[role] = gameStore.currentGame?.players.find((p) => p.role === role);
  }
  return map;
});

const playerCount = computed(() => {
  return gameStore.currentGame?.players.length ?? 0;
});

const canStart = computed(() => {
  return playerCount.value === 4 && ROLES.every((r) => playersByRole.value[r]);
});

// Listen for lobby updates
on('lobby:updated', (game: unknown) => {
  gameStore.setGame(game as Game);
});

on('player:joined', (player: unknown) => {
  const p = player as Player;
  if (gameStore.currentGame) {
    gameStore.currentGame.players.push(p);
  }
});

on('player:left', (playerId: unknown) => {
  if (gameStore.currentGame) {
    gameStore.currentGame.players = gameStore.currentGame.players.filter(
      (p) => p.id !== (playerId as string)
    );
  }
});

on('game:started', (game: unknown) => {
  gameStore.setGame(game as Game);
});

on('game:state', (state: unknown) => {
  gameStore.setRoundState(state as RoundState);
  // Navigate to game page
  router.push(`/game/${gameStore.currentGame!.id}`);
});

function selectRole(role: Role) {
  if (!gameStore.currentGame) return;
  emit('lobby:select_role', {
    gameId: gameStore.currentGame.id,
    role,
  });
  gameStore.setRole(role);
}

function startGame() {
  if (!gameStore.currentGame) return;
  emit('lobby:start_game', {
    gameId: gameStore.currentGame.id,
  });
}

// Request state on page refresh
onMounted(() => {
  if (!gameStore.currentGame && authStore.isLoggedIn) {
    const gameId = window.location.pathname.split('/').pop();
    if (gameId) {
      emit('lobby:request_state', { gameId, playerId: authStore.playerId });
    }
  }
});
</script>

<style scoped>
.subtitle {
  color: var(--color-text-muted);
  font-size: 14px;
}

.game-code-display {
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-bg);
  padding: 8px 16px;
  border-radius: var(--radius);
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 480px) {
  .players-grid {
    grid-template-columns: 1fr;
  }
}

.player-slot {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  text-align: center;
  transition: border-color 0.2s;
}

.player-slot.selected {
  border-color: var(--color-success);
  background: #f0fdf4;
}

.player-slot.is-me {
  border-color: var(--color-primary);
  background: #eff6ff;
}

.role-label {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
}

.me-badge {
  font-size: 11px;
  background: var(--color-primary);
  color: white;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.empty-slot {
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.btn-sm {
  padding: 4px 16px;
  font-size: 13px;
}

.waiting-text {
  color: var(--color-text-muted);
  font-size: 15px;
  padding: 12px 0;
}
</style>