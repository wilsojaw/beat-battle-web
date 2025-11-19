// Game Types for Beat Battle

export type NoteValue =
  | 'quarter'
  | 'half'
  | 'whole'
  | 'eighth'
  | 'dotted-quarter'
  | 'dotted-eighth'
  | 'sixteenth';

export interface NoteValueInfo {
  name: string;
  symbol: string;
  displayName: string;
  tapsPerBeat: number; // For calculating expected tap timing
  description: string;
}

export const NOTE_VALUES: Record<NoteValue, NoteValueInfo> = {
  'quarter': {
    name: 'quarter',
    symbol: '♩',
    displayName: 'Quarter Note',
    tapsPerBeat: 1,
    description: 'Tap once every beat'
  },
  'half': {
    name: 'half',
    symbol: '𝅗𝅥',
    displayName: 'Half Note',
    tapsPerBeat: 0.5,
    description: 'Tap once every 2 beats'
  },
  'whole': {
    name: 'whole',
    symbol: '𝅝',
    displayName: 'Whole Note',
    tapsPerBeat: 0.25,
    description: 'Tap once every 4 beats'
  },
  'eighth': {
    name: 'eighth',
    symbol: '♪',
    displayName: 'Eighth Note',
    tapsPerBeat: 2,
    description: 'Tap twice every beat'
  },
  'dotted-quarter': {
    name: 'dotted-quarter',
    symbol: '♩.',
    displayName: 'Dotted Quarter',
    tapsPerBeat: 0.667,
    description: 'Tap every 3 eighth notes'
  },
  'dotted-eighth': {
    name: 'dotted-eighth',
    symbol: '♪.',
    displayName: 'Dotted Eighth',
    tapsPerBeat: 1.333,
    description: 'Tap every 3 sixteenth notes'
  },
  'sixteenth': {
    name: 'sixteenth',
    symbol: '𝅘𝅥𝅯',
    displayName: 'Sixteenth Note',
    tapsPerBeat: 4,
    description: 'Tap 4 times every beat'
  }
};

export type LeaderboardStyle = 'full' | 'top3' | 'stars-only';
export type ScoringProfile = 'accuracy-only' | 'accuracy-with-streak';

export interface GameConfig {
  tempo: number; // BPM
  noteValues: NoteValue[];
  segmentDuration: number; // in bars
  totalDuration: number; // in seconds
  scoringProfile: ScoringProfile;
  leaderboardStyle: LeaderboardStyle;
  songName?: string;
}

export interface Player {
  id: string;
  name: string;
  isTeacher: boolean;
  accuracy?: number;
  score?: number;
  taps?: TapEvent[];
}

export interface TapEvent {
  timestamp: number;
  noteValue: NoteValue;
  expectedTime: number;
  accuracy: number; // ms difference from expected
}

export interface GameSegment {
  noteValue: NoteValue;
  startTime: number;
  endTime: number;
  durationBars: number;
}

export interface GameState {
  roomCode: string;
  config: GameConfig;
  players: Player[];
  status: 'setup' | 'lobby' | 'playing' | 'finished';
  currentSegment?: GameSegment;
  segments: GameSegment[];
  startTime?: number;
  teacher: Player;
}

export interface GameResult {
  player: Player;
  overallAccuracy: number;
  bestNoteType: NoteValue;
  worstNoteType: NoteValue;
  rank?: number;
}
