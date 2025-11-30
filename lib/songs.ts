// Song Catalog for Beat Battle
// Each song includes audio file, MIDI file, and metadata

import type { NoteValue } from '@/types/game';

export type TimeSignature = '4/4' | '3/4' | '2/4' | '6/8';

export interface Song {
  id: string;
  name: string;
  artist?: string;
  description: string;
  icon: string;
  
  // Audio files
  audioUrl: string;      // Path to audio file (includes count-in)
  midiUrl: string;       // Path to MIDI file for timing sync
  
  // Timing metadata
  tempo: number;         // BPM of the song
  timeSignature: TimeSignature;
  durationSeconds: number; // Total duration of the song in seconds (including count-in)
  countInSeconds: number;  // How many seconds of count-in at the start
  
  // Suggested game settings (can be overridden unless locked)
  suggestedNoteValues: NoteValue[];
  suggestedMeasuresPerSegment: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  
  // Locked settings (when song has specific choreography)
  lockedNoteValues?: NoteValue[];        // If set, these note values are forced and cannot be changed
  lockedMeasuresPerSegment?: number;     // If set, measures per segment is locked (if segmentPattern not used)
  segmentPattern?: Array<{               // Explicit segment pattern with note values and measures
    noteValue: NoteValue;
    measures: number;
  }>;
}

// The "No Song" option - metronome only
export const METRONOME_OPTION: Song = {
  id: 'metronome',
  name: 'Metronome Only',
  description: 'Classic metronome - full control over tempo and duration',
  icon: '🎵',
  audioUrl: '',
  midiUrl: '',
  tempo: 100, // Default, can be changed
  timeSignature: '4/4',
  durationSeconds: 0, // Calculated from measures
  countInSeconds: 0,
  suggestedNoteValues: ['quarter', 'half', 'eighth'],
  suggestedMeasuresPerSegment: 2,
  difficulty: 'Beginner'
};

// Song catalog - add your songs here
export const SONGS: Song[] = [
  {
    id: 'beat-battle-theme-100',
    name: 'Beat Battle Theme',
    artist: 'Beat Battle',
    description: 'The official Beat Battle theme song with guided rhythm patterns',
    icon: '🎸',
    audioUrl: '/audio/Beat_Battle_Theme_100bpm.mp3',
    midiUrl: '/audio/Beat_Battle_Theme_100bpm.mid',
    tempo: 100,
    timeSignature: '4/4',
    durationSeconds: 115, // 1:55
    countInSeconds: 2.4,  // 4 beats at 100 BPM = 2.4 seconds
    suggestedNoteValues: ['quarter', 'half', 'whole', 'eighth'],
    suggestedMeasuresPerSegment: 4,
    difficulty: 'Intermediate',
    // This song has specific choreography - lock the settings
    lockedNoteValues: ['quarter', 'half', 'whole', 'eighth'],
    lockedMeasuresPerSegment: 4,
    segmentPattern: [
      { noteValue: 'quarter', measures: 4 },
      { noteValue: 'half', measures: 4 },
      { noteValue: 'whole', measures: 4 },
      { noteValue: 'eighth', measures: 4 },
      { noteValue: 'quarter', measures: 4 }
    ]
  }
];

// All options including metronome
export const ALL_AUDIO_OPTIONS: Song[] = [METRONOME_OPTION, ...SONGS];

// Helper functions
export function getSongById(id: string): Song | undefined {
  return ALL_AUDIO_OPTIONS.find(song => song.id === id);
}

export function isMetronomeOption(song: Song): boolean {
  return song.id === 'metronome';
}

// Calculate gameplay duration (total minus count-in)
export function getGameplayDuration(song: Song): number {
  return song.durationSeconds - song.countInSeconds;
}

// Calculate measures from duration and tempo
export function calculateMeasures(song: Song): number {
  const beatsPerMeasure = song.timeSignature === '3/4' ? 3 : 
                          song.timeSignature === '6/8' ? 6 : 
                          song.timeSignature === '2/4' ? 2 : 4;
  const gameplayDuration = getGameplayDuration(song);
  const beatsPerSecond = song.tempo / 60;
  const totalBeats = gameplayDuration * beatsPerSecond;
  return Math.floor(totalBeats / beatsPerMeasure);
}

// Format duration as MM:SS
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
