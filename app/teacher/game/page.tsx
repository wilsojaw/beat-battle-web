'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { RhythmEngine } from '@/lib/rhythm-engine';
import type { GameSegment, GameConfig, LeaderboardUpdate } from '@/types/game';
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playerTaps, setPlayerTaps] = useState<Map<string, number>>(new Map());
  const [totalTaps, setTotalTaps] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUpdate | null>(null);

  const gameStartTimeRef = useRef<number>(0);
  const configRef = useRef<GameConfig | null>(null);
  const beatLogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSegmentIndexRef = useRef<number>(0);

  const handleGameStart = async (data: {
    startTime: number;
    segments: GameSegment[];
    currentSegment: GameSegment;
    config: GameConfig;
  }) => {
    // Dispose any existing rhythm engine first
    if (rhythmEngine) {
      rhythmEngine.dispose();
      rhythmEngine = null;
    }

    // Store config
    configRef.current = data.config;

    // Initialize rhythm engine with actual tempo from config
    rhythmEngine = new RhythmEngine(data.config.tempo);
    await rhythmEngine.init();

    // Teacher is the source of truth for time
    gameStartTimeRef.current = data.startTime;

    console.log('🎓 TEACHER GAME START:', JSON.stringify({
      serverStartTime: data.startTime,
      currentTime: Date.now(),
      segmentCount: data.segments.length
    }, null, 2));

    setSegments(data.segments);
    setCurrentSegmentIndex(0);
    setIsPlaying(true);

    // Start metronome (teacher hears it, broadcasts to headphones)
    // Students navigate to game page at countdown=1, so they should be ready by now
    rhythmEngine.startMetronome();
    rhythmEngine.start();

    // Log metronome beats
    let beatCount = 0;
    const beatInterval = (60 / data.config.tempo) * 1000; // ms per beat
    const logBeats = setInterval(() => {
      if (!isPlaying) {
        clearInterval(logBeats);
        return;
      }
      beatCount++;
      const beatTime = Date.now() - data.startTime;
      console.log(`🥁 BEAT ${beatCount}: ${beatTime.toFixed(2)}ms since start`);
    }, beatInterval);

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
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '');
    }

    // Rejoin room and request game state when socket connects
    const rejoinAndRequestState = () => {
      // First rejoin to update teacher socket ID
      socket.emit('teacher-rejoin', { roomCode });

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
      setCountdown(data.countdown);
    });

    socket.on('countdown-tick', (data: { countdown: number }) => {
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

    socket.on('game-ended', (data: any) => {
      router.push(`/teacher/results?code=${roomCode}`);
    });

    // Listen for student sync logs
    socket.on('student-sync-log', (data: any) => {
      console.log(`📱 ${data.playerName} - GAME START SYNC:`, JSON.stringify(data.data, null, 2));
    });

    // Listen for student tap logs
    socket.on('student-tap-log', (data: any) => {
      console.log(`📱 ${data.playerName} - TAP:`, JSON.stringify(data.data, null, 2));
    });

    // Listen for leaderboard updates
    socket.on('leaderboard-update', (update: LeaderboardUpdate) => {
      setLeaderboard(update);
    });

    return () => {
      // Remove all event listeners to prevent duplicates
      socket.off('connect');
      socket.off('countdown-start');
      socket.off('countdown-tick');
      socket.off('game-started');
      socket.off('game-ended');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('student-tap-log');
      socket.off('leaderboard-update');

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
        (seg, idx) => elapsed >= seg.startTime && elapsed < seg.endTime && idx !== currentSegmentIndexRef.current
      );

      if (currentSegment) {
        const newIndex = gameSegments.indexOf(currentSegment);
        if (newIndex !== currentSegmentIndexRef.current) {
          currentSegmentIndexRef.current = newIndex;
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
    if (beatLogIntervalRef.current) {
      clearInterval(beatLogIntervalRef.current);
    }

    socket.emit('end-game', { roomCode });
    // Navigation will happen when we receive the game-ended event
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

  const toggleMute = () => {
    if (rhythmEngine) {
      const newMutedState = rhythmEngine.toggleMute();
      setIsMuted(newMutedState);
    }
  };

  if (countdown !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-[300px] font-bold leading-none">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      </div>
    );
  }

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {/* Live Leaderboard */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">🏆 Live Leaderboard</h2>

            {leaderboard && leaderboard.topPlayers.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.topPlayers.map((player, index) => (
                  <div
                    key={player.rank}
                    className={`rounded-lg p-4 ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-300'
                        : 'bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <div className="text-lg font-bold text-gray-800">
                            {player.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Rank #{player.rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-800">
                          {player.accuracy}%
                        </div>
                        {player.hasStreak && (
                          <div className="text-xl">🔥</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center text-sm text-gray-500 mt-4 pt-4 border-t">
                  Total Players: {leaderboard.totalPlayers}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">📊</div>
                <p>Waiting for student data...</p>
                <p className="text-sm mt-2">Rankings will appear as students start tapping</p>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-4 mb-4">
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

          <div className="flex gap-4">
            <button
              onClick={toggleMute}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-colors ${
                isMuted
                  ? 'bg-gray-400 text-white hover:bg-gray-500'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              {isMuted ? '🔇 Unmute Metronome' : '🔊 Mute Metronome'}
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
