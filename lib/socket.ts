import { io, Socket } from 'socket.io-client';

// Declare global window property for socket persistence
declare global {
  interface Window {
    __beatBattleSocket?: Socket;
  }
}

// Create singleton socket instance (will be initialized lazily)
let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // Server-side rendering - return mock
    return null as any;
  }

  // Reuse existing socket if available (for hot reloads and navigation)
  if (window.__beatBattleSocket && window.__beatBattleSocket.connected) {
    return window.__beatBattleSocket;
  }

  // Create new socket connection
  if (!socketInstance || !socketInstance.connected) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    socketInstance = io(socketUrl, {
      // Connection options
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,

      // Transport options
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    });

    // Store on window for persistence
    window.__beatBattleSocket = socketInstance;

    // Connection logging
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
    });
  }

  return socketInstance;
}

// Export singleton socket instance
export const socket = getSocket();
