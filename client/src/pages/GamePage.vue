<template>
  <div class="game-page">
    <div v-if="!gameStore.currentGame || !gameStore.roundState" class="text-center mt-4">
      <p>加载游戏状态...</p>
    </div>

    <template v-else>
      <GameBoard />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import GameBoard from '@/components/game/GameBoard.vue';
import type { Game, RoundState, GameResult } from '@beer-game/shared';

const router = useRouter();
const { on, emit } = useSocket();
const authStore = useAuthStore();
const gameStore = useGameStore();

onMounted(() => {
  if (!authStore.playerId) {
    router.push('/');
    return;
  }

  const gameId = gameStore.savedGameId || window.location.pathname.split('/').pop();

  // Request current state (even on refresh when store is empty)
  emit('round:request_state', { gameId });

  // If store is empty (page refresh), also request lobby state to restore game data
  if (!gameStore.currentGame) {
    emit('lobby:request_state', { gameId, playerId: authStore.playerId });
  }

  // Listen for state updates
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
});
</script>