import type { NoteValue } from '@/types/game';

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  suggestedGrades: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  icon: string;
  settings: {
    tempo: number;
    noteValues: NoteValue[];
    totalMeasures: number;
    measuresPerSegment: number;
    showNextNote: boolean;
    leaderboardStyle: 'full' | 'top3' | 'stars-only';
  };
}

export const GAME_TEMPLATES: GameTemplate[] = [
  // === BEGINNER TEMPLATES ===
  {
    id: 'beginner-elementary',
    name: 'First Steps',
    description: 'Perfect for young beginners learning to keep a steady beat',
    suggestedGrades: 'K-2',
    difficulty: 'Beginner',
    icon: '🌱',
    settings: {
      tempo: 70,
      noteValues: ['quarter', 'half'],
      totalMeasures: 12,
      measuresPerSegment: 4,
      showNextNote: true,
      leaderboardStyle: 'stars-only'
    }
  },
  {
    id: 'beginner-elementary-up',
    name: 'Building Blocks',
    description: 'Introduce whole notes at a comfortable pace',
    suggestedGrades: '3-5',
    difficulty: 'Beginner',
    icon: '🧱',
    settings: {
      tempo: 80,
      noteValues: ['quarter', 'half', 'whole'],
      totalMeasures: 16,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'top3'
    }
  },

  // === INTERMEDIATE TEMPLATES ===
  {
    id: 'intermediate-subdivision',
    name: 'Subdivision Introduction',
    description: 'Add eighth notes to build subdivision skills',
    suggestedGrades: '4-6',
    difficulty: 'Intermediate',
    icon: '🎵',
    settings: {
      tempo: 90,
      noteValues: ['quarter', 'half', 'eighth'],
      totalMeasures: 16,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'top3'
    }
  },
  {
    id: 'intermediate-middle',
    name: 'Middle School Mix',
    description: 'Mix of all basic note values',
    suggestedGrades: '6-8',
    difficulty: 'Intermediate',
    icon: '🎼',
    settings: {
      tempo: 100,
      noteValues: ['quarter', 'half', 'whole', 'eighth'],
      totalMeasures: 20,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'full'
    }
  },
  {
    id: 'intermediate-fast-paced',
    name: 'Quick Change',
    description: 'Faster tempo with frequent note value changes',
    suggestedGrades: '7-9',
    difficulty: 'Intermediate',
    icon: '⚡',
    settings: {
      tempo: 110,
      noteValues: ['quarter', 'half', 'eighth'],
      totalMeasures: 16,
      measuresPerSegment: 1,
      showNextNote: true,
      leaderboardStyle: 'full'
    }
  },

  // === ADVANCED TEMPLATES ===
  {
    id: 'advanced-dotted',
    name: 'Dotted Rhythms',
    description: 'Introduce syncopation with dotted notes',
    suggestedGrades: '8-10',
    difficulty: 'Advanced',
    icon: '🎯',
    settings: {
      tempo: 100,
      noteValues: ['quarter', 'eighth', 'dotted-quarter'],
      totalMeasures: 20,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'full'
    }
  },
  {
    id: 'advanced-sixteenth',
    name: 'Speed Training',
    description: 'Fast subdivisions with sixteenth notes',
    suggestedGrades: '9-12',
    difficulty: 'Advanced',
    icon: '🚀',
    settings: {
      tempo: 95,
      noteValues: ['quarter', 'eighth', 'sixteenth'],
      totalMeasures: 16,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'full'
    }
  },
  {
    id: 'advanced-high-school',
    name: 'High School Challenge',
    description: 'All note values except dotted eighth, moderate tempo',
    suggestedGrades: '10-12',
    difficulty: 'Advanced',
    icon: '🎓',
    settings: {
      tempo: 110,
      noteValues: ['quarter', 'half', 'eighth', 'dotted-quarter', 'sixteenth'],
      totalMeasures: 24,
      measuresPerSegment: 2,
      showNextNote: false,
      leaderboardStyle: 'full'
    }
  },

  // === EXPERT TEMPLATES ===
  {
    id: 'expert-all-notes',
    name: 'Master Class',
    description: 'All note values with quick changes',
    suggestedGrades: '11-12 / Advanced',
    difficulty: 'Expert',
    icon: '👑',
    settings: {
      tempo: 120,
      noteValues: ['quarter', 'half', 'whole', 'eighth', 'dotted-quarter', 'dotted-eighth', 'sixteenth'],
      totalMeasures: 28,
      measuresPerSegment: 1,
      showNextNote: false,
      leaderboardStyle: 'full'
    }
  },
  {
    id: 'expert-speed-demon',
    name: 'Speed Demon',
    description: 'Fast tempo, all subdivisions',
    suggestedGrades: 'Advanced Only',
    difficulty: 'Expert',
    icon: '🔥',
    settings: {
      tempo: 140,
      noteValues: ['quarter', 'eighth', 'sixteenth'],
      totalMeasures: 20,
      measuresPerSegment: 1,
      showNextNote: false,
      leaderboardStyle: 'full'
    }
  },
  {
    id: 'expert-marathon',
    name: 'Endurance Marathon',
    description: 'Long session with all note values',
    suggestedGrades: 'Advanced Only',
    difficulty: 'Expert',
    icon: '🏃',
    settings: {
      tempo: 110,
      noteValues: ['quarter', 'half', 'eighth', 'dotted-quarter', 'sixteenth'],
      totalMeasures: 32,
      measuresPerSegment: 2,
      showNextNote: false,
      leaderboardStyle: 'full'
    }
  },

  // === FOCUS-SPECIFIC TEMPLATES ===
  {
    id: 'focus-steady-beat',
    name: 'Steady Beat Focus',
    description: 'Only quarter notes, build consistency',
    suggestedGrades: 'All Grades',
    difficulty: 'Beginner',
    icon: '🥁',
    settings: {
      tempo: 90,
      noteValues: ['quarter'],
      totalMeasures: 16,
      measuresPerSegment: 4,
      showNextNote: true,
      leaderboardStyle: 'top3'
    }
  },
  {
    id: 'focus-slow-motion',
    name: 'Slow Motion',
    description: 'Longer note values only (whole and half notes)',
    suggestedGrades: 'K-5',
    difficulty: 'Beginner',
    icon: '🐢',
    settings: {
      tempo: 60,
      noteValues: ['half', 'whole'],
      totalMeasures: 12,
      measuresPerSegment: 4,
      showNextNote: true,
      leaderboardStyle: 'stars-only'
    }
  },
  {
    id: 'focus-subdivision-drill',
    name: 'Subdivision Drill',
    description: 'Focus on eighth and sixteenth note subdivisions',
    suggestedGrades: '6-12',
    difficulty: 'Advanced',
    icon: '⚡',
    settings: {
      tempo: 100,
      noteValues: ['eighth', 'sixteenth'],
      totalMeasures: 16,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'full'
    }
  },
  {
    id: 'focus-syncopation',
    name: 'Syncopation Station',
    description: 'Dotted rhythms and syncopation practice',
    suggestedGrades: '8-12',
    difficulty: 'Advanced',
    icon: '🎭',
    settings: {
      tempo: 105,
      noteValues: ['quarter', 'dotted-quarter', 'dotted-eighth'],
      totalMeasures: 20,
      measuresPerSegment: 2,
      showNextNote: true,
      leaderboardStyle: 'full'
    }
  }
];

// Helper function to get templates by difficulty
export function getTemplatesByDifficulty(difficulty: GameTemplate['difficulty']): GameTemplate[] {
  return GAME_TEMPLATES.filter(t => t.difficulty === difficulty);
}

// Helper function to get template by ID
export function getTemplateById(id: string): GameTemplate | undefined {
  return GAME_TEMPLATES.find(t => t.id === id);
}
