'use client';

import { useStudentStore } from '@/store/studentStore';
import { NOTE_VALUES } from '@/types/game';
import { NoteImage } from '@/components/NoteImage';
import type { GameResult } from '@/types/game';

/**
 * ResultsView - Student results screen (replaces /student/results)
 *
 * Pure presentational component - reads results from Zustand store
 */
export function ResultsView() {
  const { results, playerName, setView, reset } = useStudentStore();

  const playAgain = () => {
    reset();
    setView('joining');
  };

  if (!results || !results.results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h1 className="text-4xl font-bold mb-2">Calculating Results...</h1>
        </div>
      </div>
    );
  }

  // Find this player's result
  const myResult: GameResult | undefined = results.results.find(
    (r: GameResult) => r.player.name === playerName
  );

  if (!myResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">No results found</h1>
          <button
            onClick={playAgain}
            className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50"
          >
            Join Another Game
          </button>
        </div>
      </div>
    );
  }

  const rank = results.results.findIndex((r: GameResult) => r.player.name === playerName) + 1;
  const totalPlayers = results.results.length;

  const getStarRating = (accuracy: number): number => {
    if (accuracy >= 95) return 5;
    if (accuracy >= 85) return 4;
    if (accuracy >= 75) return 3;
    if (accuracy >= 65) return 2;
    if (accuracy >= 50) return 1;
    return 1;
  };

  const stars = getStarRating(myResult.overallAccuracy);
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 py-8 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-purple-600 mb-1">🎉 Great Job!</h1>
            <p className="text-lg text-gray-600">{playerName}</p>
          </div>

          {/* Rank Badge */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 mb-4">
            <div className="text-center">
              <div className="text-5xl mb-1">{medal || '⭐'}</div>
              <div className="text-2xl font-bold text-gray-700">
                {rank === 1 ? '1st Place!' : rank === 2 ? '2nd Place!' : rank === 3 ? '3rd Place!' : `${rank}th Place`}
              </div>
              <div className="text-gray-600 mt-1">
                out of {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
              </div>
            </div>
          </div>

          {/* Accuracy Score */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-4 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700 mb-1">
                {myResult.overallAccuracy}%
              </div>
              <div className="text-lg text-gray-600 mb-1">Overall Accuracy</div>
              <div className="text-xs text-gray-500 mb-2">
                {myResult.player.taps?.length || 0} taps
              </div>

              {/* Stars */}
              <div className="text-3xl">
                {'⭐'.repeat(stars)}
                {'☆'.repeat(Math.max(0, 5 - stars))}
              </div>
            </div>
          </div>

          {/* Best & Worst Notes */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Best Note */}
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="text-center">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-xs text-gray-600 mb-1">You nailed</div>
                <div className="flex justify-center mb-1">
                  <NoteImage noteValue={myResult.bestNoteType} size={48} />
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {NOTE_VALUES[myResult.bestNoteType].displayName}
                </div>
              </div>
            </div>

            {/* Hardest Note */}
            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="text-center">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs text-gray-600 mb-1">Practice more</div>
                <div className="flex justify-center mb-1">
                  <NoteImage noteValue={myResult.worstNoteType} size={48} />
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {NOTE_VALUES[myResult.worstNoteType].displayName}
                </div>
              </div>
            </div>
          </div>

          {/* Encouragement Message */}
          <div className="bg-purple-50 rounded-xl p-4 mb-4">
            <div className="text-center">
              <p className="text-base text-purple-900 font-semibold mb-1">
                {myResult.overallAccuracy >= 90 ? '🌟 Outstanding rhythm!' :
                  myResult.overallAccuracy >= 70 ? '👏 Great job keeping the beat!' :
                    myResult.overallAccuracy >= 50 ? '💪 Good effort! Keep practicing!' :
                      '🎵 Every great musician started somewhere!'}
              </p>
              <p className="text-sm text-purple-700">
                {myResult.overallAccuracy >= 90 ? 'You have excellent timing and rhythm!' :
                  myResult.overallAccuracy >= 70 ? 'Your rhythm is getting better!' :
                    myResult.overallAccuracy >= 50 ? 'Practice makes perfect!' :
                      'Keep tapping and you\'ll improve!'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={playAgain}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg text-base"
          >
            Join Another Game 🎮
          </button>
        </div>
      </div>
    </div>
  );
}
