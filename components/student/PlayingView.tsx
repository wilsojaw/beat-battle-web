'use client';

import { useRef } from 'react';
import { useStudentStore } from '@/store/studentStore';
import { useStudentGame } from '@/hooks/useStudentGame';
import { NOTE_VALUES } from '@/types/game';
import { NoteImage } from '@/components/NoteImage';
import { StaffTimeline } from '@/components/StaffTimeline';
import Image from 'next/image';
import { LeaderboardPanel } from '@/components/LeaderboardPanel';
import { MilestoneToast } from '@/components/MilestoneToast';

/**
 * PlayingView - Main game interface for students (replaces /student/game)
 *
 * Pure presentational component - reads state from Zustand store
 * Game logic handled by useStudentGame hook
 */
export function PlayingView() {
  const {
    roomCode,
    playerName,
    currentSegment,
    nextSegment,
    currentMeasure,
    totalMeasures,
    gameConfig,
    leaderboard,
    milestones,
    personalStats,
  } = useStudentStore();

  const { isPlaying, feedback, currentAccuracy, handleTap } = useStudentGame();

  if (typeof window !== 'undefined') {
    console.log('[PlayingView] Rendering with:', {
      isPlaying,
      currentSegment: currentSegment?.noteValue,
      currentMeasure,
      hasGameConfig: !!gameConfig,
      view: useStudentStore.getState().view,
    });
  }

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-4xl sm:text-6xl mb-4 animate-bounce">🎵</div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">Get Ready!</h1>
          <p className="text-base sm:text-xl">The game is about to start...</p>
        </div>
      </div>
    );
  }

  if (!currentSegment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  const noteInfo = NOTE_VALUES[currentSegment.noteValue];
  const showNextNote = gameConfig?.showNextNote ?? true;
  const measuresPerSegment =
    gameConfig?.measuresPerSegment ||
    gameConfig?.segmentDuration ||
    currentSegment.durationBars ||
    1;

  // Debounce to prevent double-firing on touch devices
  // (onTouchStart and onMouseDown both fire, ~100ms apart)
  const lastTapTimeRef = useRef<number>(0);
  const TAP_DEBOUNCE_MS = 150; // Ignore taps within 150ms of each other

  const onTapStart = (e: React.TouchEvent | React.MouseEvent) => {
    try {
      e.preventDefault(); // Prevent default to avoid ghost clicks
      
      const now = Date.now();
      const eventType = 'type' in e ? 'touch' : 'mouse';
      const timeSinceLastTap = now - lastTapTimeRef.current;
      
      console.log('[TAP] Event:', {
        eventType,
        timeSinceLastTap,
        willProcess: timeSinceLastTap >= TAP_DEBOUNCE_MS || lastTapTimeRef.current === 0,
        isPlaying,
        currentSegment: currentSegment?.noteValue,
        gameConfigTempo: gameConfig?.tempo,
      });
      
      if (now - lastTapTimeRef.current < TAP_DEBOUNCE_MS) {
        // Ignore this tap - it's a duplicate
        console.log('[TAP] IGNORED - too soon after previous tap');
        return;
      }
      lastTapTimeRef.current = now;
      console.log('[TAP] PROCESSING tap');
      handleTap();
    } catch (error) {
      console.error('[TAP] Error in tap handler:', error);
    }
  };

  return (
    <div
      onTouchStart={onTapStart}
      onMouseDown={onTapStart}
      className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex flex-col items-center justify-between cursor-pointer select-none relative overflow-hidden"
    >
      {/* Feedback Animation */}
      {feedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`text-8xl font-bold ${
            feedback === 'great' ? 'text-green-300' :
            feedback === 'good' ? 'text-yellow-300' :
            'text-red-300'
          }`}>
            {feedback === 'great' ? '🎯' : feedback === 'good' ? '✓' : '✗'}
          </div>
        </div>
      )}

      {/* Milestone Toast Notifications */}
      <MilestoneToast milestones={milestones} />

      {/* Leaderboard Panel - Desktop (top right) */}
      <div className="hidden sm:block absolute top-28 md:top-[350px] lg:top-28 right-4">
        <LeaderboardPanel leaderboard={leaderboard} />
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-sm p-2 sm:p-4">
        <div className="flex justify-between items-start sm:items-center text-white gap-1 sm:gap-4">
          <div className="flex-shrink-0 min-w-0">
            <span className="font-semibold text-xs sm:text-base truncate block">{playerName}</span>
            <div className="text-[10px] sm:text-xs text-white/80 hidden sm:block">Room: {roomCode}</div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <div className="text-lg sm:text-2xl md:text-3xl font-bold leading-tight">
              {currentMeasure === 0 ? 'Count In' : `${currentMeasure}/${totalMeasures}`}
            </div>
            <div className="text-[10px] sm:text-xs text-white/80 hidden sm:block">Progress</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{Math.round(currentAccuracy)}%</div>
            <div className="text-[10px] sm:text-xs text-white/80">Accuracy</div>
            {personalStats && (
              <div className="text-[10px] sm:text-xs text-white/80 mt-0.5 sm:mt-1">
                {personalStats.currentStreak >= 3 && (
                  <span className="mr-1 sm:mr-2">{personalStats.currentStreak}</span>
                )}
                {personalStats.currentRank > 0 && (
                  <span>#{personalStats.currentRank}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Section: Staff + Leaderboard */}
      <div className="w-full pt-12 sm:pt-16">
        {/* Staff Timeline */}
        <div className="w-full px-2 sm:px-4">
          <StaffTimeline
            noteValue={currentSegment.noteValue}
            measuresPerSegment={measuresPerSegment}
            isCountIn={currentMeasure === 0}
            tempo={gameConfig?.tempo}
          />
        </div>

        {/* Leaderboard Panel - Mobile only (below staff) */}
        <div className="w-full px-2 sm:hidden -mt-10">
          <LeaderboardPanel leaderboard={leaderboard} />
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center text-white px-2 sm:px-4 sm:flex-1 flex flex-col justify-center">
        {/* Note Symbol */}
        <div className="flex justify-center mb-1 sm:mb-2 animate-pulse">
          <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] md:w-[200px] md:h-[200px] relative">
            <Image
              src={noteInfo.imagePath}
              alt={noteInfo.displayName}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Note Name */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2">
          {noteInfo.displayName}
        </h2>

        {/* Instructions */}
        <p className="text-sm sm:text-xl md:text-2xl mb-1 sm:mb-2 bg-white/20 backdrop-blur-sm px-4 sm:px-8 py-2 sm:py-4 rounded-full max-w-md mx-auto">
          {noteInfo.description}
        </p>

        {/* Tap Instruction */}
        <p className="text-base sm:text-xl text-white/80">
          Tap anywhere to play!
        </p>
      </div>

      {/* Bottom Section: Next Note Preview */}
      <div className="w-full pb-4 sm:pb-8">
        {showNextNote && nextSegment && (
          <div className="w-full text-center px-2">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-[clamp(8px,2vw,32px)] py-[clamp(4px,1vw,16px)] sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl">
              <div className="text-white/60 text-[clamp(10px,2.5vw,14px)] sm:text-sm mb-0.5 sm:mb-2">Next Up</div>
              <div className="flex justify-center mb-1 sm:mb-2">
                <NoteImage noteValue={nextSegment.noteValue} size={32} className="w-[clamp(32px,8vw,48px)] h-[clamp(32px,8vw,48px)] sm:w-16 sm:h-16" />
              </div>
              <div className="text-white/80 text-[clamp(10px,2.5vw,14px)] sm:text-lg mt-0.5 sm:mt-2">{NOTE_VALUES[nextSegment.noteValue].displayName}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
