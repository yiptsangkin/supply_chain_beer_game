<template>
  <div class="join-page">
    <div class="card" style="max-width: 480px; margin: 0 auto;">
      <h2>加入房间</h2>
      <form @submit.prevent="handleJoin" class="mt-2">
        <div class="form-group">
          <label class="label">房间号</label>
          <input
            v-model="gameCode"
            type="text"
            class="input"
            placeholder="输入 6 位房间号"
            maxlength="6"
            style="text-transform: uppercase;"
            required
          />
        </div>
        <div class="form-group">
          <label class="label">你的名字</label>
          <input
            v-model="playerName"
            type="text"
            class="input"
            placeholder="输入你的名字"
            maxlength="20"
            required
          />
        </div>
        <div v-if="error" class="error-text mb-2">{{ error }}</div>
        <button
          type="submit"
          class="btn btn-primary btn-lg"
          style="width: 100%;"
          :disabled="!playerName.trim() || !gameCode.trim() || isLoading"
        >
          {{ isLoading ? '加入中...' : '加入房间' }}
        </button>
      </form>
      <router-link to="/" class="btn btn-outline mt-2" style="width: 100%; display: block; text-align: center;">
        返回首页
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import type { Game, Player } from '@beer-game/shared';

const route = useRoute();
const router = useRouter();
const { connect, emit, on } = useSocket();
const authStore = useAuthStore();
const gameStore = useGameStore();

const gameCode = ref((route.params.code as string) || '');
const playerName = ref('');
const error = ref('');
const isLoading = ref(false);

function handleJoin() {
  if (!playerName.value.trim() || !gameCode.value.trim()) return;

  isLoading.value = true;
  error.value = '';

  connect();

  on('lobby:updated', (game: unknown) => {
    const g = game as Game;
    const player = g.players.find((p: Player) => p.name === playerName.value.trim());
    if (player) {
      authStore.setPlayer(playerName.value.trim(), player.id);
      gameStore.setGame(g);
      isLoading.value = false;
      router.push(`/lobby/${g.id}`);
    }
  });

  on('error', (err: unknown) => {
    const e = err as { message: string };
    error.value = e.message || '加入失败';
    isLoading.value = false;
  });

  emit('lobby:join', {
    gameCode: gameCode.value.trim().toUpperCase(),
    playerName: playerName.value.trim(),
  });
}
</script>