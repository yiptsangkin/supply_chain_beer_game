import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Game, Role, RoundState, PlayerRoundState, GameResult } from '@beer-game/shared';

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<Game | null>(null);
  const myRole = ref<Role | null>(null);
  const roundState = ref<RoundState | null>(null);
  const gameResult = ref<GameResult | null>(null);
  const isHost = ref(false);

  const myPlayerState = computed<PlayerRoundState | null>(() => {
    if (!roundState.value || !myRole.value) return null;
    return roundState.value.playerStates[myRole.value] ?? null;
  });

  const hasDecided = computed(() => {
    return myPlayerState.value?.hasDecided ?? false;
  });

  const allDecided = computed(() => {
    return roundState.value?.allDecided ?? false;
  });

  function setGame(game: Game) {
    currentGame.value = game;
  }

  function setRole(role: Role) {
    myRole.value = role;
  }

  function setRoundState(state: RoundState) {
    roundState.value = state;
  }

  function setGameResult(result: GameResult) {
    gameResult.value = result;
  }

  function reset() {
    currentGame.value = null;
    myRole.value = null;
    roundState.value = null;
    gameResult.value = null;
    isHost.value = false;
  }

  return {
    currentGame,
    myRole,
    roundState,
    gameResult,
    isHost,
    myPlayerState,
    hasDecided,
    allDecided,
    setGame,
    setRole,
    setRoundState,
    setGameResult,
    reset,
  };
});