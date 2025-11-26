'use client';

import { useStudentStore } from '@/store/studentStore';
import { socket } from '@/lib/socket';
import type { GameConfig } from '@/types/game';

/**
 * LobbyView - Waiting room for students (replaces /student/waiting)
 *
 * Pure presentational component - reads state from Zustand store
 */
export function LobbyView() {
  const {
    roomCode,
    playerName,
    playerCount,
    playerNames,
    gameConfig,
    reset,
  } = useStudentStore();

  const leaveGame = () => {
    // Leave the socket room
    socket.emit('leave-game', {
      roomCode,
      playerName,
    });

    // Reset store and go back home
    reset();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center px-4">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl px-6 py-8 sm:p-10 w-full max-w-lg relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-purple-200/40 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-pink-200/50 rounded-full blur-3xl" />
        </div>

        <div className="relative text-center space-y-6">
          <div className="size-16 mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl text-white shadow-lg shadow-purple-500/40">
            🎵
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-purple-400 mb-3">Room {roomCode}</p>
            <h1 className="text-3xl font-semibold text-gray-900">
            Welcome, {playerName}!
            </h1>
            <p className="text-sm text-gray-500">
              Waiting for your teacher to start the session
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/30 space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">Room Code</p>
            <p className="text-3xl font-bold tracking-[0.35em]">{roomCode}</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Players</p>
                <p className="text-2xl font-semibold text-gray-900">{playerCount}</p>
              </div>
              <span className="text-3xl">👥</span>
            </div>
            {playerNames.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-dashed border-gray-200">
                {playerNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-white shadow-sm text-gray-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {gameConfig && (
            <div className="rounded-2xl border border-purple-100 p-5 text-left bg-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-purple-400 mb-3">
                Game Setup
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-white/90 border border-purple-50">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400">Total Measures</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {gameConfig.totalMeasures}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/90 border border-purple-50">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400">Segment Length</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {gameConfig.measuresPerSegment}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {gameConfig.noteValues?.map((note: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/70 rounded-2xl p-5 text-left text-sm text-gray-600">
            <p className="font-semibold text-gray-900 mb-2">Quick Tips</p>
            <ul className="space-y-2">
              <li>• Tap anywhere on the screen when the game starts</li>
              <li>• Match the rhythm shown and stay with the beat</li>
              <li>• Keep your device steady to avoid false taps</li>
              <li>• Have fun and cheer on your classmates!</li>
            </ul>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" />
            <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce delay-100" />
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce delay-200" />
          </div>

          <button
            onClick={leaveGame}
            className="relative mt-4 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.3em] uppercase rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
