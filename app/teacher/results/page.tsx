'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type { GameResult, NoteValue } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

let socket: Socket;

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code') || sessionStorage.getItem('roomCode') || '';

  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      router.push('/teacher/setup');
      return;
    }

    // Connect to Socket.io
    socket = io();

    socket.on('game-ended', (data: { results: GameResult[] }) => {
      console.log('Game ended results:', data);
      setResults(data.results);
      setLoading(false);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomCode, router]);

  const playAgain = () => {
    router.push('/teacher/setup');
  };

  const exit = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h1 className="text-4xl font-bold mb-2">Calculating Results...</h1>
        </div>
      </div>
    );
  }

  // Calculate class statistics
  const averageAccuracy = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.overallAccuracy, 0) / results.length)
    : 0;

  // Find most struggled note
  const noteAccuracies = new Map<NoteValue, number[]>();
  results.forEach(result => {
    if (!noteAccuracies.has(result.worstNoteType)) {
      noteAccuracies.set(result.worstNoteType, []);
    }
    noteAccuracies.get(result.worstNoteType)!.push(result.overallAccuracy);
  });

  let mostStruggledNote: NoteValue = 'quarter';
  let lowestCount = 0;
  noteAccuracies.forEach((accuracies, note) => {
    if (accuracies.length > lowestCount) {
      lowestCount = accuracies.length;
      mostStruggledNote = note;
    }
  });

  const topPerformers = results.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-purple-600 mb-2">🏁 Game Complete!</h1>
            <p className="text-xl text-gray-600">Beat Battle Results</p>
          </div>

          {/* Class Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Average Accuracy */}
            <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-700 mb-2">{averageAccuracy}%</div>
                <div className="text-sm text-gray-600">Class Average</div>
              </div>
            </div>

            {/* Total Players */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-700 mb-2">{results.length}</div>
                <div className="text-sm text-gray-600">Total Players</div>
              </div>
            </div>

            {/* Most Struggled */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6">
              <div className="text-center">
                <div className="text-5xl mb-2">{NOTE_VALUES[mostStruggledNote].symbol}</div>
                <div className="text-sm text-gray-600">Most Struggled Note</div>
                <div className="text-xs text-gray-500 mt-1">
                  {NOTE_VALUES[mostStruggledNote].displayName}
                </div>
              </div>
            </div>
          </div>

          {/* Podium */}
          {topPerformers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-700 mb-4">🏆 Top Performers</h2>
              <div className="flex justify-center items-end gap-4 mb-6">
                {/* 2nd Place */}
                {topPerformers[1] && (
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-xl p-6 text-center">
                      <div className="text-5xl mb-2">🥈</div>
                      <div className="text-xl font-bold text-white mb-1">
                        {topPerformers[1].player.name}
                      </div>
                      <div className="text-3xl font-bold text-white">
                        {topPerformers[1].overallAccuracy}%
                      </div>
                    </div>
                    <div className="bg-gray-400 h-24 rounded-b-xl flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">2</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {topPerformers[0] && (
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-t-xl p-6 text-center">
                      <div className="text-6xl mb-2">🥇</div>
                      <div className="text-xl font-bold text-white mb-1">
                        {topPerformers[0].player.name}
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {topPerformers[0].overallAccuracy}%
                      </div>
                    </div>
                    <div className="bg-yellow-500 h-32 rounded-b-xl flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">1</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {topPerformers[2] && (
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gradient-to-b from-orange-300 to-orange-500 rounded-t-xl p-6 text-center">
                      <div className="text-4xl mb-2">🥉</div>
                      <div className="text-xl font-bold text-white mb-1">
                        {topPerformers[2].player.name}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {topPerformers[2].overallAccuracy}%
                      </div>
                    </div>
                    <div className="bg-orange-500 h-16 rounded-b-xl flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">3</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">📊 Full Leaderboard</h2>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={result.player.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0 ? 'bg-yellow-50 border-2 border-yellow-300' :
                    index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                    index === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                    'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-600 w-8">
                      {index + 1}
                    </div>
                    <div className="text-3xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎵'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700 text-lg">
                        {result.player.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Best: {NOTE_VALUES[result.bestNoteType].displayName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600">
                      {result.overallAccuracy}%
                    </div>
                    <div className="text-sm text-gray-500">accuracy</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={exit}
              className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Exit
            </button>

            <button
              onClick={playAgain}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              Play Again with Different Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherResults() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
