import { useTeacherStore } from '@/store/teacherStore';
import { useStudentStore } from '@/store/studentStore';
import type {
  GameConfig,
  GameSegment,
  LeaderboardUpdate,
  PersonalStats,
  Player,
} from '@/types/game';

const mockGameConfig: GameConfig = {
  tempo: 108,
  noteValues: ['quarter', 'eighth', 'half'],
  segmentDuration: 2,
  totalDuration: 0,
  totalMeasures: 16,
  measuresPerSegment: 2,
  showNextNote: true,
  scoringProfile: 'accuracy-only',
  leaderboardStyle: 'full',
  songName: 'Preview Groove',
};

const mockSegments: GameSegment[] = [
  { noteValue: 'eighth', startTime: 0, endTime: 16000, durationBars: 2, startMeasure: 1, endMeasure: 2 },
  { noteValue: 'whole', startTime: 16000, endTime: 32000, durationBars: 2, startMeasure: 3, endMeasure: 4 },
  { noteValue: 'half', startTime: 32000, endTime: 48000, durationBars: 2, startMeasure: 5, endMeasure: 6 },
  { noteValue: 'quarter', startTime: 48000, endTime: 64000, durationBars: 2, startMeasure: 7, endMeasure: 8 },
];

const tapSample = {
  timestamp: Date.now(),
  noteValue: 'quarter' as const,
  expectedTime: 0,
  accuracy: 12,
};

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Ava', isTeacher: false, accuracy: 96, taps: Array(25).fill(tapSample), connected: true },
  { id: 'p2', name: 'Ben', isTeacher: false, accuracy: 88, taps: Array(20).fill(tapSample), connected: true },
  { id: 'p3', name: 'Cleo', isTeacher: false, accuracy: 82, taps: Array(18).fill(tapSample), connected: true },
  { id: 'teacher', name: 'Preview Teacher', isTeacher: true, connected: true },
];

const mockLeaderboard: LeaderboardUpdate = {
  topPlayers: [
    { rank: 1, name: 'Ava', accuracy: 96, hasStreak: true },
    { rank: 2, name: 'Ben', accuracy: 88, hasStreak: false },
    { rank: 3, name: 'Cleo', accuracy: 82, hasStreak: true },
  ],
  totalPlayers: 12,
  timestamp: Date.now(),
};

const mockStudentStats: PersonalStats = {
  currentStreak: 4,
  bestStreak: 7,
  currentRank: 3,
  previousRank: 4,
  accuracy: 87,
};

export function shouldUseTeacherPreview() {
  if (typeof window === 'undefined') return false;
  const value = new URLSearchParams(window.location.search).get('preview');
  if (!value) return false;
  if (value === 'teacher') return true;
  return value === '1' || value === 'true';
}

export function shouldUseStudentPreview() {
  if (typeof window === 'undefined') return false;
  const value = new URLSearchParams(window.location.search).get('preview');
  if (!value) return false;
  if (value === 'student') return true;
  return value === '1' || value === 'true';
}

export function activateTeacherPreview() {
  const store = useTeacherStore.getState();
  if (store.previewMode) return;

  const startTime = Date.now() - 7000; // Pretend game started a bit ago

  store.setPreviewMode(true);
  store.createRoom('PREVIEW', 'Preview Teacher');
  store.setGameData({
    startTime,
    segments: mockSegments,
    config: mockGameConfig,
  });
  store.setCurrentSegment(mockSegments[0]);
  store.setPlayers(mockPlayers);
  store.setLeaderboard({
    topPlayers: mockLeaderboard.topPlayers,
    totalPlayers: mockLeaderboard.totalPlayers,
  });
  store.setCountdown(null);
}

export function activateStudentPreview() {
  const store = useStudentStore.getState();
  if (store.previewMode) return;

  const startTime = Date.now() - 5000;

  store.setPreviewMode(true);
  store.joinRoom('PREVIEW', 'Preview Student');
  store.setGameConfig(mockGameConfig);
  store.setGameData({
    startTime,
    segments: mockSegments,
    config: mockGameConfig,
  });
  store.setCurrentSegment(mockSegments[0]); // Start with eighth note for preview
  store.setNextSegment(mockSegments[1]);
  store.setPlayerNames(['Ava', 'Ben', 'Cleo', 'Preview Student']);
  store.setLeaderboard(mockLeaderboard);
  store.setPersonalStats(mockStudentStats);
  store.setCountdown(null);
  store.setCurrentMeasure(3);
  
  // Check for view parameter in URL to override default 'playing' view
  if (typeof window !== 'undefined') {
    const viewParam = new URLSearchParams(window.location.search).get('view');
    if (viewParam && ['joining', 'lobby', 'countdown', 'playing', 'finished'].includes(viewParam)) {
      store.setView(viewParam as 'joining' | 'lobby' | 'countdown' | 'playing' | 'finished');
    } else {
      store.setView('playing'); // Default to playing view for in-game screen
    }
  }
}

