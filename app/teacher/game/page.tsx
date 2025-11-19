'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { RhythmEngine } from '@/lib/rhythm-engine';
import type { GameSegment, GameConfig } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

let socket: Socket;
let rhythmEngine: RhythmEngine | null = null;

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code') || sessionStorage.getItem('roomCode') || '';

  const [segments, setSegments] = useState<GameSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playerTaps, setPlayerTaps] = useState<Map<string, number>>(new Map());
  const [totalTaps, setTotalTaps] = useState(0);

  const gameStartTimeRef = useRef<number>(0);
  const configRef = useRef<GameConfig | null>(null);

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
    setSegments(data.segments);
    setCurrentSegmentIndex(0);
    setIsPlaying(true);

    // Start metronome
    rhythmEngine.startMetronome();
    rhythmEngine.start();

    // Start countdown timer
    startCountdown(data.segments);
  };

  useEffect(() => {
    if (!roomCode) {
      router.push('/teacher/setup');
      return;
    }

    // Get config from session storage
    const roomCodeStored = sessionStorage.getItem('roomCode');
    if (roomCodeStored !== roomCode) {
      router.push('/teacher/setup');
      return;
    }

    // Reuse existing socket or create new one
    if (!socket || !socket.connected) {
      socket = io();
    }

    console.log('Teacher game page - socket connected:', socket.connected, 'socket id:', socket.id);

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

    socket.on('player-tap', (data: {
      playerId: string;
      playerName: string;
      tap: any;
    }) => {
      setPlayerTaps(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(data.playerId) || 0;
        newMap.set(data.playerId, currentCount + 1);
        return newMap;
      });
      setTotalTaps(prev => prev + 1);
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

  const startCountdown = (gameSegments: GameSegment[]) => {
    const totalDuration = gameSegments[gameSegments.length - 1]?.endTime || 120000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - gameStartTimeRef.current;
      const remaining = Math.max(0, totalDuration - elapsed);

      setTimeRemaining(remaining);

      // Check if we should move to next segment
      const currentSegment = gameSegments.find(
        (seg, idx) => elapsed >= seg.startTime && elapsed < seg.endTime && idx !== currentSegmentIndex
      );

      if (currentSegment) {
        const newIndex = gameSegments.indexOf(currentSegment);
        if (newIndex !== currentSegmentIndex) {
          setCurrentSegmentIndex(newIndex);
          socket.emit('change-segment', { roomCode, segmentIndex: newIndex });
        }
      }

      if (remaining === 0) {
        clearInterval(interval);
        endGame();
      }
    }, 100);
  };

  const endGame = () => {
    setIsPlaying(false);
    if (rhythmEngine) {
      rhythmEngine.stop();
    }

    socket.emit('end-game', { roomCode });
    router.push(`/teacher/results?code=${roomCode}`);
  };

  const pauseGame = () => {
    setIsPaused(true);
    if (rhythmEngine) {
      rhythmEngine.pause();
    }
  };

  const resumeGame = () => {
    setIsPaused(false);
    if (rhythmEngine) {
      rhythmEngine.resume();
    }
  };

  const skipToNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      const newIndex = currentSegmentIndex + 1;
      setCurrentSegmentIndex(newIndex);
      socket.emit('change-segment', { roomCode, segmentIndex: newIndex });
    }
  };

  if (!isPlaying || segments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h1 className="text-4xl font-bold mb-2">Starting Game...</h1>
        </div>
      </div>
    );
  }

  const currentSegment = segments[currentSegmentIndex];
  const noteInfo = currentSegment ? NOTE_VALUES[currentSegment.noteValue] : null;
  const nextSegment = segments[currentSegmentIndex + 1];

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-purple-600">🥁 Beat Battle</h1>
              <p className="text-gray-600">Subdivision Game</p>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-500">Time Remaining</div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-700">
                Segment {currentSegmentIndex + 1} / {segments.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Note Display */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Current Note Value</h2>
            <div className="text-center">
              <div className="text-[150px] leading-none mb-4">
                {noteInfo?.symbol}
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {noteInfo?.displayName}
              </div>
              <div className="text-lg text-gray-600">
                {noteInfo?.description}
              </div>
            </div>

            {nextSegment && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Next up:</div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {NOTE_VALUES[nextSegment.noteValue].symbol}
                  </span>
                  <span className="text-lg font-semibold text-gray-700">
                    {NOTE_VALUES[nextSegment.noteValue].displayName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Class Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Class Metrics</h2>

            <div className="space-y-6">
              {/* Total Taps */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Taps</div>
                    <div className="text-4xl font-bold text-gray-700">{totalTaps}</div>
                  </div>
                  <div className="text-5xl">👆</div>
                </div>
              </div>

              {/* Active Players */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Active Players</div>
                    <div className="text-4xl font-bold text-gray-700">{playerTaps.size}</div>
                  </div>
                  <div className="text-5xl">🎵</div>
                </div>
              </div>

              {/* Participation Rate */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Avg Taps/Player</div>
                    <div className="text-4xl font-bold text-gray-700">
                      {playerTaps.size > 0 ? Math.round(totalTaps / playerTaps.size) : 0}
                    </div>
                  </div>
                  <div className="text-5xl">📊</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-4">
            {!isPaused ? (
              <button
                onClick={pauseGame}
                className="flex-1 px-6 py-4 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition-colors"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={resumeGame}
                className="flex-1 px-6 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                ▶ Resume
              </button>
            )}

            <button
              onClick={skipToNext}
              disabled={currentSegmentIndex >= segments.length - 1}
              className="flex-1 px-6 py-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏭ Skip to Next Note
            </button>

            <button
              onClick={endGame}
              className="flex-1 px-6 py-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              🏁 End Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherGame() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
