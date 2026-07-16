import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Game, Role, RoundState, PlayerRoundState, GameResult } from '@beer-game/shared';

const STORAGE_KEY = 'beer_game_state';

function loadFromStorage(): { gameId: string; role: Role | null } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { gameId: '', role: null };
  } catch {
    return { gameId: '', role: null };
  }
}

export const useGameStore = defineStore('game', () => {
  const saved = loadFromStorage();
  const currentGame = ref<Game | null>(null);
  const myRole = ref<Role | null>(saved.role);
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

  const savedGameId = ref(saved.gameId);

  function setGame(game: Game) {
    currentGame.value = game;
    savedGameId.value = game.id;
    myRole.value = null; // Reset role for new game
    saveToStorage();
  }

  function setRole(role: Role) {
    myRole.value = role;
    saveToStorage();
  }

  function setRoundState(state: RoundState) {
    roundState.value = state;
  }

  function setGameResult(result: GameResult) {
    gameResult.value = result;
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      gameId: savedGameId.value,
      role: myRole.value,
    }));
  }

  function reset() {
    currentGame.value = null;
    myRole.value = null;
    roundState.value = null;
    gameResult.value = null;
    isHost.value = false;
    savedGameId.value = '';
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    currentGame,
    myRole,
    roundState,
    gameResult,
    isHost,
    savedGameId,
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