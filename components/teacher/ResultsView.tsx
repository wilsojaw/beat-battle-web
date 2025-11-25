'use client';

import { useMemo } from 'react';
import { useTeacherStore } from '@/store/teacherStore';
import type { GameResult, NoteValue } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

/**
 * ResultsView - Teacher results dashboard (replaces /teacher/results)
 *
 * Shows class statistics, podium, and full leaderboard
 */
export function ResultsView() {
  const { results, setView, reset } = useTeacherStore();

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        averageAccuracy: 0,
        totalPlayers: 0,
        mostStruggledNote: 'quarter' as NoteValue,
        topPerformers: []
      };
    }

    const averageAccuracy = Math.round(
      results.reduce((sum, r) => sum + r.overallAccuracy, 0) / results.length
    );

    // Find most struggled note (note that appears most as worst note)
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

    return {
      averageAccuracy,
      totalPlayers: results.length,
      mostStruggledNote,
      topPerformers
    };
  }, [results]);

  const playAgain = () => {
    reset();
    setView('setup');
  };

  const exit = () => {
    reset();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  if (!results || results.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h1 className="text-4xl font-bold mb-2">Calculating Results...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-purple-600 mb-1">🏁 Game Complete!</h1>
            <p className="text-lg text-gray-600">Beat Battle Results</p>
          </div>

          {/* Class Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Average Accuracy */}
            <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-700 mb-1">{classStats.averageAccuracy}%</div>
                <div className="text-sm text-gray-600">Class Average</div>
              </div>
            </div>

            {/* Total Players */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-700 mb-1">{classStats.totalPlayers}</div>
                <div className="text-sm text-gray-600">Total Players</div>
              </div>
            </div>

            {/* Most Struggled */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4">
              <div className="text-center">
                <div className="text-3xl mb-1">{NOTE_VALUES[classStats.mostStruggledNote].symbol}</div>
                <div className="text-sm text-gray-600">Most Struggled Note</div>
                <div className="text-xs text-gray-500 mt-1">
                  {NOTE_VALUES[classStats.mostStruggledNote].displayName}
                </div>
              </div>
            </div>
          </div>

          {/* Podium */}
          {classStats.topPerformers.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-700 mb-3">🏆 Top Performers</h2>
              <div className="flex justify-center items-end gap-3 mb-4">
                {/* 2nd Place */}
                {classStats.topPerformers[1] && (
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-xl p-4 text-center">
                      <div className="text-3xl mb-1">🥈</div>
                      <div className="text-lg font-bold text-white mb-1">
                        {classStats.topPerformers[1].player.name}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {classStats.topPerformers[1].overallAccuracy}%
                      </div>
                    </div>
                    <div className="bg-gray-400 h-16 rounded-b-xl flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">2</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {classStats.topPerformers[0] && (
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-t-xl p-4 text-center">
                      <div className="text-4xl mb-1">🥇</div>
                      <div className="text-lg font-bold text-white mb-1">
                        {classStats.topPerformers[0].player.name}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {classStats.topPerformers[0].overallAccuracy}%
                      </div>
                    </div>
                    <div className="bg-yellow-500 h-20 rounded-b-xl flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">1</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {classStats.topPerformers[2] && (
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gradient-to-b from-orange-300 to-orange-500 rounded-t-xl p-4 text-center">
                      <div className="text-3xl mb-1">🥉</div>
                      <div className="text-lg font-bold text-white mb-1">
                        {classStats.topPerformers[2].player.name}
                      </div>
                      <div className="text-xl font-bold text-white">
                        {classStats.topPerformers[2].overallAccuracy}%
                      </div>
                    </div>
                    <div className="bg-orange-500 h-12 rounded-b-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">3</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-700 mb-3">📊 Full Leaderboard</h2>
            <div className="space-y-2">
              {results.map((result: GameResult, index: number) => (
                <div
                  key={result.player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-yellow-50 border-2 border-yellow-300' :
                      index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                        index === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                          'bg-gray-50 border border-gray-200'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold text-gray-600 w-6">
                      {index + 1}
                    </div>
                    <div className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎵'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700 text-base">
                        {result.player.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Best: {NOTE_VALUES[result.bestNoteType].displayName} • {result.player.taps?.length || 0} taps
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">
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
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Exit
            </button>

            <button
              onClick={playAgain}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              Play Again with Different Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
