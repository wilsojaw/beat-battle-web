'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// Store socket on window to persist across hot reloads and page navigations
declare global {
  interface Window {
    studentSocket?: Socket;
  }
}

let socket: Socket;

function WaitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('Player');

  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [status, setStatus] = useState('Waiting for teacher to start...');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Get values from sessionStorage on client side only
    const code = searchParams.get('code') || (typeof window !== 'undefined' ? sessionStorage.getItem('roomCode') : '') || '';
    const name = (typeof window !== 'undefined' ? sessionStorage.getItem('playerName') : '') || 'Player';

    setRoomCode(code);
    setPlayerName(name);
  }, [searchParams]);

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    // Reuse existing socket from window or create new one
    if (typeof window !== 'undefined' && window.studentSocket) {
      socket = window.studentSocket;
    } else if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '');
      if (typeof window !== 'undefined') {
        window.studentSocket = socket;
      }
    }

    console.log('Student waiting page - socket connected:', socket.connected, 'socket id:', socket.id);

    // Make sure we're in the room to receive game-started event
    if (socket.connected) {
      socket.emit('student-rejoin', { roomCode, playerName });
    }

    socket.on('connect', () => {
      console.log('Student socket connected in waiting room');
      socket.emit('student-rejoin', { roomCode, playerName });
    });

    socket.on('player-count-update', (data: { totalPlayers: number }) => {
      console.log('Player count update:', data);
      setPlayerCount(data.totalPlayers);
    });

    socket.on('player-joined', (data: { totalPlayers: number; playerNames?: string[]; config?: any }) => {
      console.log('Player joined event in waiting room:', data);
      setPlayerCount(data.totalPlayers);
      if (data.playerNames) {
        setPlayerNames(data.playerNames);
      }
      if (data.config) {
        setGameConfig(data.config);
      }
    });

    socket.on('player-left', (data: { totalPlayers: number; playerNames?: string[] }) => {
      setPlayerCount(data.totalPlayers);
      if (data.playerNames) {
        setPlayerNames(data.playerNames);
      }
    });

    socket.on('countdown-start', async (data: { countdown: number }) => {
      console.log('⏱️ Countdown start:', data.countdown);
      setCountdown(data.countdown);

      // Navigate to game page immediately when countdown starts
      // This ensures students are already there before game-started event
      console.log('🎮 Navigating to game page for countdown...');
      router.push(`/student/game?code=${roomCode}`);

      // Pre-initialize Tone.js audio context during countdown to reduce lag
      try {
        const Tone = await import('tone');
        await Tone.start();
        console.log('🔊 Audio context primed during countdown');
      } catch (e) {
        console.log('Audio context initialization error:', e);
      }
    });

    socket.on('countdown-tick', (data: { countdown: number }) => {
      console.log('⏱️ Countdown tick:', data.countdown);
      setCountdown(data.countdown);
      // No longer navigate here - we navigate on countdown-start instead
    });

    socket.on('game-started', (data: any) => {
      console.log('game-started event received in waiting room!', data);
      // Students should already be on game page by now
      // This is just a fallback in case they're still here
      setCountdown(null);
      setStatus('Game starting!');
      setTimeout(() => {
        router.push(`/student/game?code=${roomCode}`);
      }, 100);
    });

    socket.on('teacher-disconnected', () => {
      alert('Teacher disconnected. Returning to join screen.');
      router.push('/student/join');
    });

    return () => {
      // Don't disconnect socket - we need it for the game page
    };
  }, [roomCode, playerName, router]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🎵</div>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">
            Welcome, {playerName}!
          </h1>
          <p className="text-xl text-gray-600 mb-8">{status}</p>

          {/* Room Code */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-8">
            <p className="text-sm text-gray-600 mb-1">Room Code:</p>
            <p className="text-4xl font-bold tracking-wider text-purple-600">
              {roomCode}
            </p>
          </div>

          {/* Player Count and Names */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl">👥</span>
              <div>
                <p className="text-3xl font-bold text-gray-700">
                  {playerCount}
                </p>
                <p className="text-sm text-gray-600">
                  {playerCount === 1 ? 'Player' : 'Players'} in Lobby
                </p>
              </div>
            </div>
            {playerNames.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-300">
                <p className="text-xs text-gray-600 mb-2 font-semibold">Players:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {playerNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 shadow-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Game Mechanics */}
          {gameConfig && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-purple-900 mb-3 text-lg">🎮 Game Setup</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600 text-xs mb-1">Total Measures</p>
                  <p className="text-2xl font-bold text-purple-600">{gameConfig.totalMeasures}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600 text-xs mb-1">Measures per Note</p>
                  <p className="text-2xl font-bold text-pink-600">{gameConfig.measuresPerSegment}</p>
                </div>
              </div>
              <div className="mt-4 bg-white rounded-lg p-3">
                <p className="text-gray-600 text-xs mb-2">Note Values in Game:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {gameConfig.noteValues?.map((note: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">🎮 Get Ready!</h3>
            <ul className="text-left text-sm text-blue-800 space-y-2">
              <li>• Watch for the note values on your screen</li>
              <li>• Tap anywhere on the screen to play the rhythm</li>
              <li>• Try to stay in time with the beat</li>
              <li>• Have fun and don't worry about mistakes!</li>
            </ul>
          </div>

          {/* Loading Animation */}
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-pink-600 rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentWaiting() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <WaitingContent />
    </Suspense>
  );
}
