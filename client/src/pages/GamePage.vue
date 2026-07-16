<template>
  <div class="game-page">
    <div v-if="!gameStore.currentGame || !gameStore.roundState" class="text-center mt-4">
      <p>加载游戏状态...</p>
      <p v-if="loadError" class="error-text mt-1">{{ loadError }}</p>
    </div>

    <template v-else>
      <GameBoard />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import GameBoard from '@/components/game/GameBoard.vue';
import type { Game, RoundState, GameResult } from '@beer-game/shared';

const router = useRouter();
const { on, emit, connect, connected } = useSocket();
const authStore = useAuthStore();
const gameStore = useGameStore();
const loadError = ref('');

// Register listeners in setup phase (before onMounted)
on('lobby:updated', (game: unknown) => {
  gameStore.setGame(game as Game);
});

on('game:state', (state: unknown) => {
  gameStore.setRoundState(state as RoundState);
});

on('game:round_processed', (state: unknown) => {
  gameStore.setRoundState(state as RoundState);
});

on('game:finished', (result: unknown) => {
  gameStore.setGameResult(result as GameResult);
  router.push(`/result/${gameStore.currentGame!.id}`);
});

on('error', (err: unknown) => {
  const e = err as { message: string };
  loadError.value = e.message || '加载失败';
  console.error('Game error:', e.message);
});

onMounted(() => {
  connect();

  if (!authStore.playerId) {
    router.push('/');
    return;
  }

  const gameId = gameStore.savedGameId || window.location.pathname.split('/').pop();
  if (!gameId) return;

  const checkAndRequest = () => {
    if (connected.value) {
      emit('round:request_state', { gameId });
      if (!gameStore.currentGame) {
        emit('lobby:request_state', { gameId, playerId: authStore.playerId });
      }
    } else {
      setTimeout(checkAndRequest, 100);
    }
  };
  checkAndRequest();
});
</script>