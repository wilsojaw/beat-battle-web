'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type { GameResult } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

let socket: Socket;

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code') || (typeof window !== 'undefined' ? sessionStorage.getItem('roomCode') : '') || '';
  const playerName = (typeof window !== 'undefined' ? sessionStorage.getItem('playerName') : '') || 'Player';

  const [result, setResult] = useState<GameResult | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      router.push('/student/join');
      return;
    }

    // Reuse existing socket (should already be connected from game page)
    if (!socket) {
      socket = io();
    }

    const handleGameEnded = (data: { results: GameResult[] }) => {
      // Find this player's result
      const myResult = data.results.find(r => r.player.name === playerName);

      if (myResult) {
        setResult(myResult);
        // Calculate rank
        const myRank = data.results.findIndex(r => r.player.name === playerName) + 1;
        setRank(myRank);
        setTotalPlayers(data.results.length);
      }

      setLoading(false);
    };

    socket.on('game-ended', handleGameEnded);

    // If socket isn't connected yet, wait for connection
    if (!socket.connected) {
      socket.on('connect', () => {
        socket.emit('student-rejoin', { roomCode, playerName });
      });
    } else {
      // Rejoin the room to receive events
      socket.emit('student-rejoin', { roomCode, playerName });
    }

    return () => {
      socket.off('game-ended', handleGameEnded);
      // Don't disconnect socket
    };
  }, [roomCode, router, playerName]);

  const playAgain = () => {
    router.push('/student/join');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h1 className="text-4xl font-bold mb-2">Calculating Results...</h1>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">No results found</h1>
          <button
            onClick={() => router.push('/student/join')}
            className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50"
          >
            Join Another Game
          </button>
        </div>
      </div>
    );
  }

  const getStarRating = (accuracy: number): number => {
    if (accuracy >= 90) return 3;
    if (accuracy >= 70) return 2;
    if (accuracy >= 50) return 1;
    return 0;
  };

  const stars = getStarRating(result.overallAccuracy);
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-purple-600 mb-2">🎉 Great Job!</h1>
            <p className="text-xl text-gray-600">{playerName}</p>
          </div>

          {/* Rank Badge */}
          {rank && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="text-7xl mb-2">{medal || '⭐'}</div>
                <div className="text-3xl font-bold text-gray-700">
                  {rank === 1 ? '1st Place!' : rank === 2 ? '2nd Place!' : rank === 3 ? '3rd Place!' : `${rank}th Place`}
                </div>
                <div className="text-gray-600 mt-1">
                  out of {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
                </div>
              </div>
            </div>
          )}

          {/* Accuracy Score */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-8 mb-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-gray-700 mb-2">
                {result.overallAccuracy}%
              </div>
              <div className="text-xl text-gray-600 mb-2">Overall Accuracy</div>
              <div className="text-sm text-gray-500 mb-4">
                {result.player.taps?.length || 0} taps
              </div>

              {/* Stars */}
              <div className="text-5xl">
                {'⭐'.repeat(stars)}
                {'☆'.repeat(3 - stars)}
              </div>
            </div>
          </div>

          {/* Best & Worst Notes */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Best Note */}
            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
              <div className="text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm text-gray-600 mb-2">You nailed</div>
                <div className="text-4xl mb-1">
                  {NOTE_VALUES[result.bestNoteType].symbol}
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {NOTE_VALUES[result.bestNoteType].displayName}
                </div>
              </div>
            </div>

            {/* Hardest Note */}
            <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-sm text-gray-600 mb-2">Practice more</div>
                <div className="text-4xl mb-1">
                  {NOTE_VALUES[result.worstNoteType].symbol}
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {NOTE_VALUES[result.worstNoteType].displayName}
                </div>
              </div>
            </div>
          </div>

          {/* Encouragement Message */}
          <div className="bg-purple-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <p className="text-lg text-purple-900 font-semibold mb-2">
                {result.overallAccuracy >= 90 ? '🌟 Outstanding rhythm!' :
                 result.overallAccuracy >= 70 ? '👏 Great job keeping the beat!' :
                 result.overallAccuracy >= 50 ? '💪 Good effort! Keep practicing!' :
                 '🎵 Every great musician started somewhere!'}
              </p>
              <p className="text-sm text-purple-700">
                {result.overallAccuracy >= 90 ? 'You have excellent timing and rhythm!' :
                 result.overallAccuracy >= 70 ? 'Your rhythm is getting better!' :
                 result.overallAccuracy >= 50 ? 'Practice makes perfect!' :
                 'Keep tapping and you\'ll improve!'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={playAgain}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg text-lg"
          >
            Join Another Game 🎮
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentResults() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
