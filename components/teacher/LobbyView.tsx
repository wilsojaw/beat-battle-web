'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useTeacherStore } from '@/store/teacherStore';

/**
 * LobbyView - Teacher lobby with player list (replaces /teacher/lobby)
 *
 * Pure presentational component - reads state from Zustand store
 */
export function LobbyView() {
  const { roomCode, players, setView } = useTeacherStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);

  useEffect(() => {
    // Set join URL after mount to avoid hydration issues
    if (typeof window !== 'undefined') {
      setJoinUrl(window.location.origin);
    }

    // Check if all players are ready
    setAllPlayersReady(players.every(p => p.connected !== false));
  }, [players]);

  const startGame = () => {
    if (players.length === 0) {
      setError('Wait for at least one player to join!');
      return;
    }

    if (!allPlayersReady) {
      setError('Some players are still connecting. Please wait...');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('start-game', { roomCode }, (response: any) => {
      if (response.success) {
        // View will auto-transition when game-started event fires from SocketManager
        // Just wait a moment to ensure everything is synced
        setTimeout(() => {
          setLoading(false);
        }, 100);
      } else {
        setError('Failed to start game. Please try again.');
        setLoading(false);
      }
    });
  };

  const cancelGame = () => {
    if (typeof window !== 'undefined') {
      useTeacherStore.getState().reset();
      window.location.href = '/';
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
                {joinUrl}/student
              </p>
              <div className="bg-white rounded-lg py-6 px-8 inline-block shadow-lg relative">
                <p className="text-sm text-gray-600 mb-1">Room Code:</p>
                <div className="flex items-center gap-4">
                  <p className="text-6xl font-bold tracking-wider text-purple-600">
                    {roomCode}
                  </p>
                  <button
                    onClick={copyCode}
                    className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                    title="Copy code"
                  >
                    {copied ? (
                      <span className="text-2xl">✓</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {copied && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded text-sm">
                    Copied!
                  </div>
                )}
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
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200 animate-fade-in relative"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">🎵</div>
                      <div className="font-bold text-gray-900 truncate text-lg">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Player {index + 1}
                      </div>
                      <div className="mt-2">
                        {player.connected !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                            Connecting...
                          </span>
                        )}
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
              disabled={loading || players.length === 0 || !allPlayersReady}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Starting...' : !allPlayersReady && players.length > 0 ? 'Waiting for all players to connect...' : `Start Beat Battle ${players.length > 0 ? `(${players.length} ${players.length === 1 ? 'player' : 'players'})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
