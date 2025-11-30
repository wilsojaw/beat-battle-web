// Game Types for Beat Battle

export type NoteValue =
  | 'quarter'
  | 'half'
  | 'whole'
  | 'eighth'
  | 'dotted-quarter'
  | 'sixteenth';

export interface NoteValueInfo {
  name: string;
  symbol: string;
  displayName: string;
  tapsPerBeat: number; // For calculating expected tap timing
  description: string;
  imagePath: string; // Path to note image graphic
  imageScale?: number; // Optional scale adjustment for image sizing
}

export const NOTE_VALUES: Record<NoteValue, NoteValueInfo> = {
  'quarter': {
    name: 'quarter',
    symbol: '♩',
    displayName: 'Quarter Note',
    tapsPerBeat: 1,
    description: 'Tap once every beat',
    imagePath: '/graphics/quarter_note.png'
  },
  'half': {
    name: 'half',
    symbol: '𝅗𝅥',
    displayName: 'Half Note',
    tapsPerBeat: 0.5,
    description: 'Tap once every 2 beats',
    imagePath: '/graphics/half_note.png'
  },
  'whole': {
    name: 'whole',
    symbol: '𝅝',
    displayName: 'Whole Note',
    tapsPerBeat: 0.25,
    description: 'Tap once every 4 beats',
    imagePath: '/graphics/whole_note.png',
    imageScale: 0.9
  },
  'eighth': {
    name: 'eighth',
    symbol: '♪',
    displayName: 'Eighth Note',
    tapsPerBeat: 2,
    description: 'Tap twice every beat',
    imagePath: '/graphics/eighth_note.png'
  },
  'dotted-quarter': {
    name: 'dotted-quarter',
    symbol: '♩.',
    displayName: 'Dotted Quarter',
    tapsPerBeat: 0.667,
    description: 'Tap every 3 eighth notes',
    imagePath: '/graphics/dotted_quarter.png'
  },
  'sixteenth': {
    name: 'sixteenth',
    symbol: '𝅘𝅥𝅯',
    displayName: 'Sixteenth Note',
    tapsPerBeat: 4,
    description: 'Tap 4 times every beat',
    imagePath: '/graphics/sixteenth_note.png'
  }
};

export type LeaderboardStyle = 'full' | 'top3' | 'stars-only';
export type ScoringProfile = 'accuracy-only' | 'accuracy-with-streak';
export type TimeSignature = '4/4' | '3/4' | '2/4' | '6/8';

// Audio metadata for songs
export interface AudioMetadata {
  songId: string;        // ID of the song from the catalog
  audioUrl: string;      // Path to audio file
  midiUrl: string;       // Path to MIDI file for timing sync
  tempo: number;         // BPM of the song
  timeSignature: TimeSignature;
}

export interface GameConfig {
  tempo: number; // BPM
  noteValues: NoteValue[];
  segmentDuration: number; // in measures (how many measures per note value)
  totalDuration: number; // in seconds (deprecated - use totalMeasures)
  totalMeasures?: number; // total measures in the game
  measuresPerSegment?: number; // how many measures per segment (same as segmentDuration)
  showNextNote?: boolean; // show next note preview to students
  scoringProfile: ScoringProfile;
  leaderboardStyle: LeaderboardStyle;
  songName?: string;
  timeSignature?: TimeSignature; // Time signature (default 4/4)
  audio?: AudioMetadata; // Audio configuration (if using a song)
  segmentPattern?: Array<{ // Explicit segment pattern with note values and measures
    noteValue: NoteValue;
    measures: number;
  }>;
}

export interface Player {
  id: string;
  name: string;
  isTeacher: boolean;
  accuracy?: number;
  score?: number;
  taps?: TapEvent[];
  connected?: boolean;             // Socket connection status

  // Real-time stats tracking
  currentStreak?: number;          // Current consecutive "great" taps
  bestStreak?: number;             // Best streak this session
  currentRank?: number;            // Live ranking position
  previousRank?: number;           // Rank from last update (for change detection)
  lastMilestoneTimestamps?: Map<string, number>; // Cooldown tracking per milestone type
}

export interface TapEvent {
  timestamp: number;
  noteValue: NoteValue;
  expectedTime: number;
  accuracy: number; // ms difference from expected (interval error)
  interval?: number; // actual interval between this tap and previous tap (ms)
  expectedInterval?: number; // expected interval for this note value (ms)
}

export interface GameSegment {
  noteValue: NoteValue;
  startTime: number;
  endTime: number;
  durationBars: number;
  startMeasure?: number; // 1-indexed measure number for display
  endMeasure?: number;
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

// Milestone & Stats Types
export type MilestoneType =
  | 'streak'
  | 'accuracy'
  | 'competitive'
  | 'note-specific'
  | 'recovery';

export interface MilestoneEvent {
  id: string;                    // Unique ID for this milestone instance
  type: MilestoneType;
  playerId: string;
  playerName: string;
  message: string;               // Pre-formatted message to display
  icon: string;                  // Emoji icon
  broadcast: boolean;            // true = all students, false = only this student
  timestamp: number;             // When it was triggered
  data?: any;                    // Additional context (e.g., streak count, note type)
}

export interface LeaderboardUpdate {
  topPlayers: Array<{           // Top 3 players
    rank: number;
    name: string;
    accuracy: number;
    hasStreak: boolean;
  }>;
  totalPlayers: number;
  timestamp: number;
}

export interface PersonalStats {
  currentStreak: number;
  bestStreak: number;
  currentRank: number;
  previousRank: number;
  accuracy: number;
}
