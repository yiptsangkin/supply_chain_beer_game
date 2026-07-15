import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const playerName = ref('');
  const playerId = ref('');
  const sessionId = ref(crypto.randomUUID());

  const isLoggedIn = computed(() => playerName.value !== '' && playerId.value !== '');

  function setPlayer(name: string, id: string) {
    playerName.value = name;
    playerId.value = id;
  }

  function reset() {
    playerName.value = '';
    playerId.value = '';
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