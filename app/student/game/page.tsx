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
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<'great' | 'good' | 'miss' | null>(null);
  const [taps, setTaps] = useState<TapEvent[]>([]);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);

  const gameStartTimeRef = useRef<number>(0);
  const expectedTapTimesRef = useRef<number[]>([]);
  const segmentsRef = useRef<GameSegment[]>([]);
  const tapAreaRef = useRef<HTMLDivElement>(null);

  const handleGameStart = async (data: {
    startTime: number;
    segments: GameSegment[];
    currentSegment: GameSegment;
  }) => {
    console.log('handleGameStart called with:', data);

    // Initialize rhythm engine
    rhythmEngine = new RhythmEngine(100);
    await rhythmEngine.init();

    gameStartTimeRef.current = Date.now();
    segmentsRef.current = data.segments;
    setCurrentSegment(data.currentSegment);
    setIsPlaying(true);

    // Calculate expected tap times for current segment
    updateExpectedTaps(data.currentSegment);

    // Start metronome
    rhythmEngine.startMetronome();
    rhythmEngine.start();
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

    console.log('Student game page - socket connected:', socket.connected, 'socket id:', socket.id);

    // Request game state when socket connects
    const requestGameState = () => {
      console.log('Requesting game state for room:', roomCode);
      socket.emit('get-game-state', { roomCode }, (response: any) => {
        console.log('Got game state response:', response);
        if (response.success && response.game.status === 'playing') {
          handleGameStart({
            startTime: response.game.startTime,
            segments: response.game.segments,
            currentSegment: response.game.currentSegment
          });
        }
      });
    };

    // If socket is already connected, request immediately
    if (socket.connected) {
      requestGameState();
    }

    // Also listen for connect event in case socket isn't connected yet
    socket.on('connect', () => {
      console.log('Socket connected, requesting game state');
      requestGameState();
    });

    socket.on('game-started', async (data: {
      startTime: number;
      segments: GameSegment[];
      currentSegment: GameSegment;
    }) => {
      console.log('game-started event received!', data);
      handleGameStart(data);
    });

    socket.on('segment-changed', (data: { segment: GameSegment }) => {
      console.log('Segment changed:', data.segment);
      setCurrentSegment(data.segment);
      updateExpectedTaps(data.segment);
    });

    socket.on('game-ended', (data: any) => {
      console.log('Game ended:', data);
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
      if (socket) {
        socket.disconnect();
      }
      if (rhythmEngine) {
        rhythmEngine.dispose();
      }
    };
  }, [roomCode, router]);

  const updateExpectedTaps = (segment: GameSegment) => {
    if (!rhythmEngine) return;

    const durationMs = segment.endTime - segment.startTime;
    const durationSeconds = durationMs / 1000;

    expectedTapTimesRef.current = rhythmEngine.getExpectedTapTimes(
      segment.noteValue,
      durationSeconds
    );
  };

  const handleTap = () => {
    if (!isPlaying || !currentSegment || !rhythmEngine) return;

    const tapTime = Date.now() - gameStartTimeRef.current;

    // Calculate accuracy
    const { accuracy, nearestExpected, isAccurate } = rhythmEngine.calculateTapAccuracy(
      tapTime,
      expectedTapTimesRef.current
    );

    // Create tap event
    const tapEvent: TapEvent = {
      timestamp: tapTime,
      noteValue: currentSegment.noteValue,
      expectedTime: nearestExpected,
      accuracy
    };

    setTaps(prev => [...prev, tapEvent]);

    // Submit tap to server
    socket.emit('submit-tap', { roomCode, tap: tapEvent });

    // Show feedback
    if (Math.abs(accuracy) < 50) {
      setFeedback('great');
      rhythmEngine.playClick();
    } else if (Math.abs(accuracy) < 100) {
      setFeedback('good');
      rhythmEngine.playClick();
    } else {
      setFeedback('miss');
    }

    // Calculate current accuracy
    const recentTaps = [...taps, tapEvent].slice(-10);
    const avgAccuracy = recentTaps.reduce((sum, t) => {
      return sum + Math.max(0, 100 - Math.abs(t.accuracy) / 2);
    }, 0) / recentTaps.length;
    setCurrentAccuracy(Math.round(avgAccuracy));

    // Clear feedback after animation
    setTimeout(() => setFeedback(null), 300);

    // Add visual feedback
    if (tapAreaRef.current) {
      tapAreaRef.current.classList.add('scale-95');
      setTimeout(() => {
        tapAreaRef.current?.classList.remove('scale-95');
      }, 100);
    }
  };

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

  const noteInfo = NOTE_VALUES[currentSegment.noteValue];

  return (
    <div
      ref={tapAreaRef}
      onClick={handleTap}
      className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-100 relative overflow-hidden"
    >
      {/* Feedback Animation */}
      {feedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`text-8xl font-bold animate-ping ${
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
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(currentAccuracy)}%</div>
            <div className="text-xs">Accuracy</div>
          </div>
          <div className="text-right">
            <div className="text-sm">Room: {roomCode}</div>
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
