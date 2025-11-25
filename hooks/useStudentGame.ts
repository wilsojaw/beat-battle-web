import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '@/lib/socket';
import { useStudentStore } from '@/store/studentStore';
import { useSocketStore } from '@/store/socketStore';
import { RhythmEngine } from '@/lib/rhythm-engine';
import { NOTE_VALUES } from '@/types/game';
import type { TapEvent, GameSegment } from '@/types/game';

/**
 * useStudentGame - Business logic hook for student gameplay
 *
 * Handles:
 * - Rhythm engine initialization
 * - Tap handling and accuracy calculation
 * - Real-time measure updates
 * - Segment transitions
 */
export function useStudentGame() {
  const {
    roomCode,
    playerName,
    gameData,
    currentSegment,
    addTap,
    setCurrentMeasure,
    setNextSegment,
  } = useStudentStore();

  const { clockOffset } = useSocketStore();

  const [feedback, setFeedback] = useState<'great' | 'good' | 'miss' | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const rhythmEngineRef = useRef<RhythmEngine | null>(null);
  const previousTapTimeRef = useRef<number | null>(null);
  const previousSegmentRef = useRef<GameSegment | null>(null);
  const currentSegmentRef = useRef<GameSegment | null>(null);
  const tapsInCurrentSegmentRef = useRef<number>(0);
  const measureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameInitializedRef = useRef<boolean>(false); // Track if game has been initialized

  // Get synchronized server time
  const getSyncedTime = useCallback(() => {
    return Date.now() + clockOffset;
  }, [clockOffset]);

  // Initialize rhythm engine when game starts
  useEffect(() => {
    if (!gameData) return;
    if (rhythmEngineRef.current) return; // Prevent double initialization

    const initGame = async () => {
      console.log('[useStudentGame] Initializing rhythm engine with tempo:', gameData.config.tempo);

      // Initialize rhythm engine
      rhythmEngineRef.current = new RhythmEngine(gameData.config.tempo);

      // Skip audio initialization for Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (!isSafari) {
        await rhythmEngineRef.current.init();
        rhythmEngineRef.current.start();
        setIsPlaying(true);
      } else {
        console.log('[useStudentGame] Rhythm engine instantiated (audio context skipped for Safari compatibility)');
      }

      // Initialize segment refs from gameData
      const initialSegment = gameData.segments[0];
      if (initialSegment) {
        console.log('[useStudentGame] Initializing with first segment:', initialSegment.noteValue);
        currentSegmentRef.current = initialSegment;
        previousSegmentRef.current = initialSegment;
      }

      // Calculate timing constants
      const tempo = gameData.config.tempo;
      const beatsPerMeasure = 4;
      const beatDuration = (60 / tempo) * 1000;
      const measureDuration = beatDuration * beatsPerMeasure;
      const countInDuration = measureDuration;

      // Simple polling for measure updates only
      let lastMeasure = 0;
      measureIntervalRef.current = setInterval(() => {
        const elapsed = getSyncedTime() - gameData.startTime;

        // Update current measure only when it changes
        const currentMeasureNum = Math.floor((elapsed - countInDuration) / measureDuration) + 1;
        if (currentMeasureNum !== lastMeasure) {
          lastMeasure = currentMeasureNum;
          setCurrentMeasure(currentMeasureNum);
        }
      }, 100);
    };

    initGame();

    return () => {
      if (measureIntervalRef.current) {
        clearInterval(measureIntervalRef.current);
      }
      if (rhythmEngineRef.current) {
        rhythmEngineRef.current.stop();
      }
    };
  }, [gameData, getSyncedTime, setCurrentMeasure, setNextSegment]);

  // Update current segment ref when it changes (via socket events)
  useEffect(() => {
    if (currentSegment && currentSegment.startTime !== currentSegmentRef.current?.startTime) {
      // Save previous segment before updating
      previousSegmentRef.current = currentSegmentRef.current;
      currentSegmentRef.current = currentSegment;

      // Reset tap counter for new segment
      tapsInCurrentSegmentRef.current = 0;
    }
  }, [currentSegment]);

  // Handle tap
  const handleTap = useCallback(() => {
    if (!isPlaying || !currentSegmentRef.current || !rhythmEngineRef.current) {
      return;
    }

    const tapTime = getSyncedTime();

    // Determine which segment to use for timing calculation
    const isFirstTapInSegment = tapsInCurrentSegmentRef.current === 0;
    const segmentForCalculation = (isFirstTapInSegment && previousSegmentRef.current)
      ? previousSegmentRef.current
      : currentSegmentRef.current;

    // Calculate expected interval based on note value
    const noteInfo = NOTE_VALUES[segmentForCalculation.noteValue];
    const beatDuration = 60 / (gameData?.config.tempo || 120); // seconds per beat
    const expectedInterval = (beatDuration / noteInfo.tapsPerBeat) * 1000; // ms between taps

    // Calculate accuracy using rhythm engine
    const tapResult = rhythmEngineRef.current.calculateTapAccuracy(
      tapTime,
      previousTapTimeRef.current,
      expectedInterval
    );

    // Create tap event
    const tapEvent: TapEvent = {
      timestamp: tapTime,
      noteValue: currentSegmentRef.current.noteValue,
      expectedTime: 0, // Server will calculate this
      accuracy: tapResult.accuracy,
      interval: tapResult.interval,
      expectedInterval: expectedInterval,
    };

    // Store tap
    addTap(tapEvent);

    // Send to server
    socket.emit('submit-tap', { roomCode, tap: tapEvent });

    // Update refs
    previousTapTimeRef.current = tapTime;
    tapsInCurrentSegmentRef.current++;

    // Show feedback
    if (tapResult.interval > 0) {
      if (Math.abs(tapResult.accuracy) < 30) {
        setFeedback('great');
      } else if (Math.abs(tapResult.accuracy) < 75) {
        setFeedback('good');
      } else {
        setFeedback('miss');
      }
    } else {
      // First tap always gets positive feedback
      setFeedback('great');
    }

    // Update accuracy display
    const store = useStudentStore.getState();
    const recentTaps = [...store.taps, tapEvent].slice(-10);
    const avgAccuracy = recentTaps.reduce((sum, t) => {
      return sum + Math.max(0, 100 - Math.abs(t.accuracy) / 2);
    }, 0) / recentTaps.length;
    setCurrentAccuracy(Math.round(avgAccuracy));

    // Clear feedback
    setTimeout(() => setFeedback(null), 100);
  }, [isPlaying, getSyncedTime, addTap, roomCode]);

  return {
    isPlaying,
    feedback,
    currentAccuracy,
    handleTap,
  };
}
