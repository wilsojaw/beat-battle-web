'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type { Player } from '@/types/game';

let socket: Socket;

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code') || sessionStorage.getItem('roomCode') || '';

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinUrl, setJoinUrl] = useState('localhost:3000');

  useEffect(() => {
    if (!roomCode) {
      router.push('/teacher/setup');
      return;
    }

    // Set join URL after mount to avoid hydration issues
    setJoinUrl(window.location.origin);

    // Connect to Socket.io
    socket = io();

    socket.on('connect', () => {
      console.log('Teacher connected to Socket.io:', socket.id);
      // Teacher needs to join the room to receive player-joined events
      socket.emit('teacher-rejoin', { roomCode });
    });

    socket.on('player-joined', (data: { player: Player; totalPlayers: number }) => {
      console.log('Player joined:', data);

      setPlayers(prev => {
        // Avoid duplicates
        if (prev.find(p => p.id === data.player.id)) {
          return prev;
        }
        return [...prev, data.player];
      });
    });

    socket.on('player-left', (data: { player: Player; totalPlayers: number }) => {
      setPlayers(prev => prev.filter(p => p.id !== data.player.id));
    });

    return () => {
      // Don't disconnect socket - we need it for the game page
    };
  }, [roomCode, router]);

  const startGame = () => {
    if (players.length === 0) {
      setError('Wait for at least one player to join!');
      return;
    }

    setLoading(true);
    socket.emit('start-game', { roomCode }, (response: any) => {
      if (response.success) {
        // Navigate after a small delay to ensure event is broadcast
        setTimeout(() => {
          router.push(`/teacher/game?code=${roomCode}`);
        }, 100);
      } else {
        setError('Failed to start game. Please try again.');
        setLoading(false);
      }
    });
  };

  const cancelGame = () => {
    if (socket) {
      socket.disconnect();
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-2">🎓 Game Lobby</h1>
          <p className="text-gray-600 mb-8">Students can join now!</p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Join Code Display */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-8">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Students, join at:
              </p>
              <p className="text-2xl font-bold text-purple-600 mb-3">
                {joinUrl}/student/join
              </p>
              <div className="bg-white rounded-lg py-6 px-8 inline-block shadow-lg">
                <p className="text-sm text-gray-600 mb-1">Room Code:</p>
                <p className="text-6xl font-bold tracking-wider text-purple-600">
                  {roomCode}
                </p>
              </div>
            </div>
          </div>

          {/* Player Count */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">👥</span>
              <span className="text-2xl font-bold text-gray-700">
                {players.length} {players.length === 1 ? 'Student' : 'Students'} Joined
              </span>
            </div>
          </div>

          {/* Players List */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Students in Lobby:</h2>
            {players.length === 0 ? (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <p className="text-xl text-gray-500">Waiting for students to join...</p>
                <p className="text-sm text-gray-400 mt-2">The room code will appear on their screen</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200 animate-fade-in"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">🎵</div>
                      <div className="font-bold text-gray-900 truncate text-lg">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Player {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={cancelGame}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel Game
            </button>

            <button
              onClick={startGame}
              disabled={loading || players.length === 0}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Starting...' : `Start Beat Battle ${players.length > 0 ? `(${players.length} ${players.length === 1 ? 'player' : 'players'})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherLobby() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LobbyContent />
    </Suspense>
  );
}
