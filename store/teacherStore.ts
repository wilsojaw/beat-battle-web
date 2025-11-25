import { create } from 'zustand';
import type { GameConfig, GameSegment, Player, GameResult } from '@/types/game';

export type TeacherView = 'setup' | 'lobby' | 'playing' | 'finished';

interface LeaderboardPlayer {
  rank: number;
  name: string;
  accuracy: number;
  hasStreak: boolean;
}

interface Leaderboard {
  topPlayers: LeaderboardPlayer[];
  totalPlayers: number;
}

interface TeacherState {
  // View state
  view: TeacherView;

  // Room info
  roomCode: string | null;
  teacherName: string;

  // Setup state
  gameConfig: GameConfig | null;

  // Lobby state
  players: Player[];

  // Playing state
  gameData: {
    startTime: number;
    segments: GameSegment[];
    config: GameConfig;
  } | null;
  currentSegment: GameSegment | null;
  countdown: number | null;
  leaderboard: Leaderboard | null;

  // Results state
  results: GameResult[] | null;

  // Actions
  setView: (view: TeacherView) => void;
  createRoom: (roomCode: string, teacherName: string) => void;
  setGameConfig: (config: GameConfig) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setCountdown: (countdown: number | null) => void;
  setGameData: (data: { startTime: number; segments: GameSegment[]; config: GameConfig }) => void;
  setCurrentSegment: (segment: GameSegment) => void;
  setLeaderboard: (leaderboard: Leaderboard | null) => void;
  setResults: (results: GameResult[]) => void;
  reset: () => void;
}

const initialState = {
  view: 'setup' as TeacherView,
  roomCode: null,
  teacherName: '',
  gameConfig: null,
  players: [],
  gameData: null,
  currentSegment: null,
  countdown: null,
  leaderboard: null,
  results: null,
};

export const useTeacherStore = create<TeacherState>((set, get) => ({
  ...initialState,

  setView: (view) => set({ view }),

  createRoom: (roomCode, teacherName) => {
    // Store in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('roomCode', roomCode);
      sessionStorage.setItem('teacherName', teacherName);
    }
    set({ roomCode, teacherName });
  },

  setGameConfig: (gameConfig) => set({ gameConfig }),

  setPlayers: (players) => set({ players }),

  addPlayer: (player) => set((state) => {
    // Check if player already exists
    const exists = state.players.some(p => p.id === player.id);
    if (exists) {
      // Update existing player
      return {
        players: state.players.map(p => p.id === player.id ? player : p)
      };
    }
    // Add new player
    return { players: [...state.players, player] };
  }),

  removePlayer: (playerId) => set((state) => ({
    players: state.players.filter(p => p.id !== playerId)
  })),

  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, ...updates } : p
    )
  })),

  setCountdown: (countdown) => set({ countdown }),

  setGameData: (gameData) => set({ gameData, view: 'playing' }),

  setCurrentSegment: (currentSegment) => set({ currentSegment }),

  setLeaderboard: (leaderboard) => set({ leaderboard }),

  setResults: (results) => set({ results, view: 'finished' }),

  reset: () => set(initialState),
}));
