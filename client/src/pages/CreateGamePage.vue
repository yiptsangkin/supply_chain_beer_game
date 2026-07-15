<template>
  <div class="create-page">
    <div class="card" style="max-width: 480px; margin: 0 auto;">
      <h2>创建房间</h2>
      <form @submit.prevent="handleCreate" class="mt-2">
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
        <div class="form-group">
          <label class="label">游戏回合数（默认 24）</label>
          <input
            v-model.number="totalRounds"
            type="number"
            class="input"
            min="10"
            max="50"
          />
        </div>
        <div v-if="error" class="error-text mb-2">{{ error }}</div>
        <button
          type="submit"
          class="btn btn-primary btn-lg"
          style="width: 100%;"
          :disabled="!playerName.trim() || isLoading"
        >
          {{ isLoading ? '创建中...' : '创建房间' }}
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
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import type { Game } from '@beer-game/shared';

const router = useRouter();
const { connect, emit, on } = useSocket();
const authStore = useAuthStore();
const gameStore = useGameStore();

const playerName = ref('');
const totalRounds = ref(24);
const error = ref('');
const isLoading = ref(false);

function handleCreate() {
  if (!playerName.value.trim()) return;

  isLoading.value = true;
  error.value = '';

  connect();

  on('lobby:updated', (game: unknown) => {
    const g = game as Game;
    authStore.setPlayer(playerName.value.trim(), g.players[0].id);
    gameStore.setGame(g);
    gameStore.isHost = true;
    isLoading.value = false;
    router.push(`/lobby/${g.id}`);
  });

  on('error', (err: unknown) => {
    const e = err as { message: string };
    error.value = e.message || '创建失败';
    isLoading.value = false;
  });

  emit('lobby:create', {
    playerName: playerName.value.trim(),
    totalRounds: totalRounds.value,
  });
}
</script>