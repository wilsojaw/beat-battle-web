'use client';

import { useStudentStore } from '@/store/studentStore';
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
  } = useStudentStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🎵</div>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">
            Welcome, {playerName}!
          </h1>
          <p className="text-xl text-gray-600 mb-8">Waiting for teacher to start...</p>

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
