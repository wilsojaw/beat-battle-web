import { create } from 'zustand';
import type { GameConfig, GameSegment, Player, TapEvent, MilestoneEvent, LeaderboardUpdate, PersonalStats } from '@/types/game';

export type StudentView = 'joining' | 'lobby' | 'countdown' | 'playing' | 'finished';

interface StudentState {
  // View state
  view: StudentView;

  // Player info
  roomCode: string | null;
  playerName: string;

  // Lobby state
  playerCount: number;
  playerNames: string[];
  gameConfig: GameConfig | null;

  // Countdown state
  countdown: number | null;

  // Playing state
  gameData: {
    startTime: number;
    segments: GameSegment[];
    config: GameConfig;
  } | null;
  currentSegment: GameSegment | null;
  nextSegment: GameSegment | null;
  currentMeasure: number;
  totalMeasures: number;
  taps: TapEvent[];

  // Live stats
  personalStats: PersonalStats | null;
  leaderboard: LeaderboardUpdate | null;
  milestones: MilestoneEvent[];

  // Results state
  results: any | null;

  // Actions
  setView: (view: StudentView) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  setPlayerCount: (count: number) => void;
  setPlayerNames: (names: string[]) => void;
  setGameConfig: (config: GameConfig) => void;
  setCountdown: (countdown: number | null) => void;
  setGameData: (data: { startTime: number; segments: GameSegment[]; config: GameConfig }) => void;
  setCurrentSegment: (segment: GameSegment) => void;
  setNextSegment: (segment: GameSegment | null) => void;
  setCurrentMeasure: (measure: number) => void;
  addTap: (tap: TapEvent) => void;
  setPersonalStats: (stats: PersonalStats) => void;
  setLeaderboard: (leaderboard: LeaderboardUpdate) => void;
  addMilestone: (milestone: MilestoneEvent) => void;
  setResults: (results: any) => void;
  reset: () => void;
}

const getStoredValue = (key: string) => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(key);
};

const initialState = {
  view: 'joining' as StudentView,
  roomCode: getStoredValue('roomCode'),
  playerName: getStoredValue('playerName') || '',
  playerCount: 0,
  playerNames: [],
  gameConfig: null,
  countdown: null,
  gameData: null,
  currentSegment: null,
  nextSegment: null,
  currentMeasure: 0,
  totalMeasures: 0,
  taps: [],
  personalStats: null,
  leaderboard: null,
  milestones: [],
  results: null,
};

export const useStudentStore = create<StudentState>((set, get) => ({
  ...initialState,

  setView: (view) => set({ view }),

  joinRoom: (roomCode, playerName) => {
    // Store in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('roomCode', roomCode);
      sessionStorage.setItem('playerName', playerName);
    }
    set({ roomCode, playerName });
  },

  setPlayerCount: (playerCount) => set({ playerCount }),
  setPlayerNames: (playerNames) => set({ playerNames, playerCount: playerNames.length }),
  setGameConfig: (gameConfig) => set({ gameConfig }),
  setCountdown: (countdown) => set({ countdown }),

  setGameData: (gameData) => {
    const totalMeasures = gameData.segments[gameData.segments.length - 1]?.endMeasure || 16;
    set({
      gameData,
      totalMeasures,
      view: 'playing'
    });
  },

  setCurrentSegment: (currentSegment) => set({ currentSegment }),
  setNextSegment: (nextSegment) => set({ nextSegment }),
  setCurrentMeasure: (currentMeasure) => set({ currentMeasure }),

  addTap: (tap) => set((state) => ({ taps: [...state.taps, tap] })),

  setPersonalStats: (personalStats) => set({ personalStats }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),

  addMilestone: (milestone) => set((state) => ({
    milestones: [...state.milestones, milestone]
  })),

  setResults: (results) => set({ results, view: 'finished' }),

  reset: () => set(initialState),
}));
