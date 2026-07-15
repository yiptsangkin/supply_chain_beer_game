import { io, type Socket } from 'socket.io-client';
import { ref } from 'vue';
import { SERVER_URL } from '@/config';

let socket: Socket | null = null;
const connected = ref(false);
const pendingHandlers: Array<{ event: string; handler: (...args: any[]) => void }> = [];

export function useSocket() {
  function connect() {
    if (socket?.connected) return;

    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      connected.value = true;
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });

    // Replay pending handlers
    for (const { event, handler } of pendingHandlers) {
      socket.on(event, handler);
    }
    pendingHandlers.length = 0;
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
    connected.value = false;
  }

  function emit(event: string, data: unknown) {
    socket?.emit(event, data);
  }

  function on(event: string, handler: (...args: any[]) => void) {
    if (socket) {
      socket.on(event, handler);
    } else {
      pendingHandlers.push({ event, handler });
    }
  }

  function off(event: string, handler?: (...args: any[]) => void) {
    socket?.off(event, handler);
  }

  return {
    connected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}