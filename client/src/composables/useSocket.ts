import { io, type Socket } from 'socket.io-client';
import { ref, onUnmounted } from 'vue';
import { SERVER_URL } from '@/config';

const socket = ref<Socket | null>(null);
const connected = ref(false);

export interface SocketComposable {
  socket: ReturnType<typeof ref<Socket | null>>;
  connected: ReturnType<typeof ref<boolean>>;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: unknown) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

export function useSocket(): SocketComposable {
  function connect() {
    if (socket.value?.connected) return;

    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    s.on('connect', () => {
      connected.value = true;
    });

    s.on('disconnect', () => {
      connected.value = false;
    });

    socket.value = s;
  }

  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
  }

  function emit(event: string, data: unknown) {
    socket.value?.emit(event, data);
  }

  function on(event: string, handler: (...args: any[]) => void) {
    socket.value?.on(event, handler);
  }

  function off(event: string, handler?: (...args: any[]) => void) {
    socket.value?.off(event, handler);
  }

  onUnmounted(() => {
    // Don't disconnect on unmount, keep connection alive across route changes
  });

  return {
    socket,
    connected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}