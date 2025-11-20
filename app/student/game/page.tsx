'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { RhythmEngine } from '@/lib/rhythm-engine';
import type { NoteValue, GameSegment, TapEvent } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

let socket: Socket;
let rhythmEngine: RhythmEngine | null = null;

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code') || sessionStorage.getItem('roomCode') || '';
  const playerName = sessionStorage.getItem('playerName') || 'Player';

  const [currentSegment, setCurrentSegment] = useState<GameSegment | null>(null);
  const [nextSegment, setNextSegment] = useState<GameSegment | null>(null);
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [totalMeasures, setTotalMeasures] = useState(16);
  const [showNextNote, setShowNextNote] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'great' | 'good' | 'miss' | null>(null);
  const [taps, setTaps] = useState<TapEvent[]>([]);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);

  const gameStartTimeRef = useRef<number>(0);
  const serverStartTimeRef = useRef<number>(0);
  const localOffsetRef = useRef<number>(0);
  const previousTapTimeRef = useRef<number | null>(null);
  const previousSegmentRef = useRef<GameSegment | null>(null);
  const currentSegmentRef = useRef<GameSegment | null>(null);
  const tapsInCurrentSegmentRef = useRef<number>(0);
  const segmentsRef = useRef<GameSegment[]>([]);
  const tapAreaRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<GameConfig | null>(null);

  const handleGameStart = async (data: {
    startTime: number;
    segments: GameSegment[];
    currentSegment: GameSegment;
    config: GameConfig;
  }) => {
    const localReceiveTime = Date.now();

    // Store config for use in tap handling
    configRef.current = data.config;

    // Initialize rhythm engine (audio context should already be primed)
    rhythmEngine = new RhythmEngine(data.config.tempo);
    // Don't need to init again if already primed, but call it to be safe
    try {
      await rhythmEngine.init();
    } catch (e) {
      console.log('Audio context already started');
    }

    // Calculate timing sync
    serverStartTimeRef.current = data.startTime;
    gameStartTimeRef.current = localReceiveTime;
    localOffsetRef.current = localReceiveTime - data.startTime;

    const syncInfo = {
      serverStartTime: data.startTime,
      localReceiveTime: localReceiveTime,
      networkLag: localOffsetRef.current,
      lagMs: `${localOffsetRef.current}ms`
    };

    console.log('🎮 GAME START SYNC:', syncInfo);

    // Send sync info to teacher
    socket.emit('student-sync-log', {
      roomCode,
      playerName,
      type: 'game-start',
      data: syncInfo
    });

    segmentsRef.current = data.segments;
    currentSegmentRef.current = data.currentSegment;
    setCurrentSegment(data.currentSegment);
    previousSegmentRef.current = data.currentSegment;
    tapsInCurrentSegmentRef.current = 0;
    setTotalMeasures(data.segments[data.segments.length - 1]?.endMeasure || 16);
    setCurrentMeasure(data.currentSegment.startMeasure || 1);

    // Find next segment
    const currentIndex = data.segments.findIndex(s =>
      s.noteValue === data.currentSegment.noteValue && s.startTime === data.currentSegment.startTime
    );
    if (currentIndex >= 0 && currentIndex < data.segments.length - 1) {
      setNextSegment(data.segments[currentIndex + 1]);
    } else {
      setNextSegment(null);
    }

    setIsPlaying(true);

    // Calculate expected tap times for current segment
    updateExpectedTaps(data.currentSegment);

    // NO METRONOME for students - audio comes from headphones
    // rhythmEngine.startMetronome(); // DISABLED
    rhythmEngine.start();

    // Update current measure in real-time (every beat)
    const tempo = data.config.tempo;
    const beatDuration = (60 / tempo) * 1000; // ms per beat
    const beatsPerMeasure = 4;
    const measureDuration = beatDuration * beatsPerMeasure;
    const countInDuration = measureDuration; // 1 measure count-in

    const measureInterval = setInterval(() => {
      const elapsed = Date.now() - data.startTime;

      // Account for count-in: measure 0 during count-in, then 1-based
      const currentMeasureNum = Math.floor((elapsed - countInDuration) / measureDuration) + 1;
      const totalMeas = data.segments[data.segments.length - 1]?.endMeasure || 16;

      if (currentMeasureNum <= totalMeas) {
        setCurrentMeasure(Math.max(0, currentMeasureNum)); // Show 0 during count-in
      } else {
        clearInterval(measureInterval);
      }
    }, 100); // Check every 100ms

    // Store interval ref for cleanup
    (window as any).measureInterval = measureInterval;
  };

  useEffect(() => {
    if (!roomCode) {
      router.push('/student/join');
      return;
    }

    // Reuse existing socket or create new one
    if (!socket || !socket.connected) {
      socket = io();
    }

    // Rejoin room and request game state when socket connects
    const rejoinAndRequestState = () => {
      // First rejoin to update socket ID on server
      socket.emit('student-rejoin', { roomCode, playerName });

      // Then request game state
      socket.emit('get-game-state', { roomCode }, (response: any) => {
        if (response.success && response.game.status === 'playing') {
          handleGameStart({
            startTime: response.game.startTime,
            segments: response.game.segments,
            currentSegment: response.game.currentSegment,
            config: response.game.config
          });
        }
      });
    };

    // If socket is already connected, rejoin and request immediately
    if (socket.connected) {
      rejoinAndRequestState();
    }

    // Also listen for connect event in case socket isn't connected yet
    socket.on('connect', () => {
      rejoinAndRequestState();
    });

    socket.on('countdown-start', (data: { countdown: number }) => {
      console.log('⏱️ Countdown start:', data.countdown);
      setCountdown(data.countdown);
    });

    socket.on('countdown-tick', (data: { countdown: number }) => {
      console.log('⏱️ Countdown tick:', data.countdown);
      setCountdown(data.countdown);
    });

    socket.on('game-started', async (data: {
      startTime: number;
      segments: GameSegment[];
      currentSegment: GameSegment;
      config: GameConfig;
    }) => {
      setCountdown(null);
      handleGameStart(data);
    });

    socket.on('segment-changed', (data: { segment: GameSegment }) => {
      // Save previous segment before updating
      previousSegmentRef.current = currentSegmentRef.current;
      currentSegmentRef.current = data.segment;
      tapsInCurrentSegmentRef.current = 0;

      console.log(`🔄 Segment changed: ${previousSegmentRef.current?.noteValue} -> ${data.segment.noteValue}`);

      setCurrentSegment(data.segment);
      // Don't update current measure here - let the interval handle it
      updateExpectedTaps(data.segment);

      // Find next segment
      const currentIndex = segmentsRef.current.findIndex(s => s.noteValue === data.segment.noteValue && s.startTime === data.segment.startTime);
      if (currentIndex >= 0 && currentIndex < segmentsRef.current.length - 1) {
        setNextSegment(segmentsRef.current[currentIndex + 1]);
      } else {
        setNextSegment(null);
      }

      // DON'T reset previous tap - we want to measure intervals across segments too
    });

    socket.on('game-ended', (data: any) => {
      if (rhythmEngine) {
        rhythmEngine.stop();
      }
      router.push(`/student/results?code=${roomCode}`);
    });

    socket.on('teacher-disconnected', () => {
      alert('Teacher disconnected. Game ended.');
      if (rhythmEngine) {
        rhythmEngine.stop();
      }
      router.push('/student/join');
    });

    return () => {
      // Remove all event listeners to prevent duplicates
      socket.off('connect');
      socket.off('countdown-start');
      socket.off('countdown-tick');
      socket.off('game-started');
      socket.off('segment-changed');
      socket.off('game-ended');
      socket.off('teacher-disconnected');

      // Clean up measure interval
      if ((window as any).measureInterval) {
        clearInterval((window as any).measureInterval);
      }
    };
  }, [roomCode, router]);

  const updateExpectedTaps = (segment: GameSegment) => {
    // No longer needed - we're using interval-based accuracy now
    // Just here for compatibility with segment-changed event
  };

  const handleTap = () => {
    if (!isPlaying || !currentSegmentRef.current || !rhythmEngine) return;

    const localTapTime = Date.now();
    const tapTimeSinceLocalStart = localTapTime - gameStartTimeRef.current;
    const tapTimeSinceServerStart = localTapTime - serverStartTimeRef.current;

    // Determine which segment's interval to use for accuracy calculation
    // For the first tap in a new segment, use the PREVIOUS segment's expected interval
    const isFirstTapInSegment = tapsInCurrentSegmentRef.current === 0;
    const segmentForCalculation = (isFirstTapInSegment && previousSegmentRef.current)
      ? previousSegmentRef.current
      : currentSegmentRef.current;

    const debugMsg = `Tap #${tapsInCurrentSegmentRef.current + 1} in segment | Using: ${segmentForCalculation.noteValue} | Current: ${currentSegmentRef.current.noteValue} | Prev: ${previousSegmentRef.current?.noteValue || 'none'}`;
    console.log('👆 ' + debugMsg);

    // Calculate expected interval for this note value
    const noteInfo = NOTE_VALUES[segmentForCalculation.noteValue];
    const beatDuration = 60 / (configRef.current?.tempo || 100) * 1000; // ms per beat
    const expectedInterval = beatDuration / noteInfo.tapsPerBeat;

    // Increment tap count for this segment
    tapsInCurrentSegmentRef.current++;

    // Calculate accuracy using interval-based method
    const { accuracy, interval, isAccurate } = rhythmEngine.calculateTapAccuracy(
      tapTimeSinceServerStart,
      previousTapTimeRef.current,
      expectedInterval
    );

    // Update previous tap time for next tap
    previousTapTimeRef.current = tapTimeSinceServerStart;

    // Create tap event
    // Use the segmentForCalculation's note value (which is the previous segment for first tap)
    const tapEvent: TapEvent = {
      timestamp: tapTimeSinceServerStart,
      noteValue: segmentForCalculation.noteValue,
      expectedTime: expectedInterval,
      accuracy,
      interval,
      expectedInterval
    };

    // Log detailed timing info
    const tapLog = {
      localTapTime: localTapTime,
      tapTimeSinceLocalStart: tapTimeSinceLocalStart.toFixed(2) + 'ms',
      tapTimeSinceServerStart: tapTimeSinceServerStart.toFixed(2) + 'ms',
      interval: interval.toFixed(2) + 'ms',
      expectedInterval: expectedInterval.toFixed(2) + 'ms',
      accuracy: accuracy.toFixed(2) + 'ms',
      noteValue: currentSegment.noteValue,
      isAccurate: isAccurate,
      isFirstTap: interval === 0
    };

    console.log('👆 TAP:', tapLog);

    // Send tap log to teacher
    socket.emit('student-tap-log', {
      roomCode,
      playerName,
      data: tapLog
    });

    setTaps(prev => [...prev, tapEvent]);

    // Submit tap to server
    socket.emit('submit-tap', { roomCode, tap: tapEvent });

    // Show feedback (only for non-first taps)
    if (interval > 0) {
      if (Math.abs(accuracy) < 30) {
        setFeedback('great');
      } else if (Math.abs(accuracy) < 75) {
        setFeedback('good');
      } else {
        setFeedback('miss');
      }
    } else {
      // First tap always gets positive feedback
      setFeedback('great');
    }

    // Calculate current accuracy
    const recentTaps = [...taps, tapEvent].slice(-10);
    const avgAccuracy = recentTaps.reduce((sum, t) => {
      return sum + Math.max(0, 100 - Math.abs(t.accuracy) / 2);
    }, 0) / recentTaps.length;
    setCurrentAccuracy(Math.round(avgAccuracy));

    // Clear feedback immediately
    setTimeout(() => setFeedback(null), 100);

    // No visual feedback animation - removed for faster response
  };

  if (countdown !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-[300px] font-bold leading-none">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <h1 className="text-4xl font-bold mb-2">Get Ready!</h1>
          <p className="text-xl">The game is about to start...</p>
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

  const noteInfo = currentSegment ? NOTE_VALUES[currentSegment.noteValue] : NOTE_VALUES['quarter'];

  return (
    <div
      ref={tapAreaRef}
      onClick={handleTap}
      className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex flex-col items-center justify-center cursor-pointer select-none relative overflow-hidden"
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

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-sm p-4">
        <div className="flex justify-between items-center text-white">
          <div>
            <span className="font-semibold">{playerName}</span>
            <div className="text-xs text-white/80">Room: {roomCode}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">
              {currentMeasure === 0 ? 'Count In' : `Measure ${currentMeasure} / ${totalMeasures}`}
            </div>
            <div className="text-xs text-white/80">Current Progress</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(currentAccuracy)}%</div>
            <div className="text-xs">Accuracy</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="text-center text-white px-4">
        {/* Note Symbol */}
        <div className="text-[200px] leading-none mb-8 animate-pulse">
          {noteInfo.symbol}
        </div>

        {/* Note Name */}
        <h2 className="text-5xl font-bold mb-4">
          {noteInfo.displayName}
        </h2>

        {/* Instructions */}
        <p className="text-2xl mb-8 bg-white/20 backdrop-blur-sm px-8 py-4 rounded-full">
          {noteInfo.description}
        </p>

        {/* Tap Instruction */}
        <p className="text-xl text-white/80 animate-bounce">
          👆 Tap anywhere to play!
        </p>
      </div>

      {/* Next Note Preview */}
      {showNextNote && nextSegment && (
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-8 py-4 rounded-2xl">
            <div className="text-white/60 text-sm mb-2">Next Up</div>
            <div className="text-6xl text-white/80">{NOTE_VALUES[nextSegment.noteValue].symbol}</div>
            <div className="text-white/80 text-lg mt-2">{NOTE_VALUES[nextSegment.noteValue].displayName}</div>
          </div>
        </div>
      )}

      {/* Bottom Help Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/60 text-sm">
          Listen to the metronome and tap in rhythm
        </p>
      </div>
    </div>
  );
}

export default function StudentGame() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
