import { create } from 'zustand';

interface SocketState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  socketId: string | null;
  latency: number | null;
  clockOffset: number;

  // Actions
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setError: (error: string | null) => void;
  setSocketId: (socketId: string | null) => void;
  setLatency: (latency: number) => void;
  setClockOffset: (offset: number) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  reconnecting: false,
  error: null,
  socketId: null,
  latency: null,
  clockOffset: 0,
};

export const useSocketStore = create<SocketState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected, error: null }),
  setReconnecting: (reconnecting) => set({ reconnecting }),
  setError: (error) => set({ error }),
  setSocketId: (socketId) => set({ socketId }),
  setLatency: (latency) => set({ latency }),
  setClockOffset: (offset) => set({ clockOffset: offset }),
  reset: () => set(initialState),
}));
