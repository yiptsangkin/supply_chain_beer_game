import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'beer_game_auth';

function loadFromStorage(): { playerName: string; playerId: string } {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { playerName: '', playerId: '' };
  } catch {
    return { playerName: '', playerId: '' };
  }
}

export const useAuthStore = defineStore('auth', () => {
  const saved = loadFromStorage();
  const playerName = ref(saved.playerName);
  const playerId = ref(saved.playerId);
  const sessionId = ref(crypto.randomUUID());

  const isLoggedIn = computed(() => playerName.value !== '' && playerId.value !== '');

  function saveToStorage() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      playerName: playerName.value,
      playerId: playerId.value,
    }));
  }

  function setPlayer(name: string, id: string) {
    playerName.value = name;
    playerId.value = id;
    saveToStorage();
  }

  function reset() {
    playerName.value = '';
    playerId.value = '';
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return {
    playerName,
    playerId,
    sessionId,
    isLoggedIn,
    setPlayer,
    reset,
  };
});