import { io, Socket } from 'socket.io-client';

// Declare global window property for socket persistence
declare global {
  interface Window {
    __beatBattleSocket?: Socket;
  }
}

// Create singleton socket instance
let socket: Socket;

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
  if (!socket || !socket.connected) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    socket = io(socketUrl, {
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
    window.__beatBattleSocket = socket;

    // Connection logging
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
    });
  }

  return socket;
}

// Export singleton socket instance
export const socket = getSocket();
