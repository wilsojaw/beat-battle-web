'use client';

import type { LeaderboardUpdate } from '@/types/game';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardUpdate | null;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardPanel({ leaderboard }: LeaderboardPanelProps) {
  if (!leaderboard || leaderboard.topPlayers.length === 0) {
    return null;
  }

  return (
    <div className="
      absolute
      top-16 right-2
      sm:top-20 sm:right-4
      bg-black/30 backdrop-blur-md rounded-xl
      p-2 sm:p-3
      border border-white/20 shadow-xl
      max-w-[160px] sm:max-w-none
      z-10
    ">
      <div className="text-white/80 text-[10px] sm:text-xs font-semibold mb-1 sm:mb-2 text-center">
        TOP 3
      </div>
      <div className="space-y-1 sm:space-y-2">
        {leaderboard.topPlayers.map((player) => (
          <div
            key={player.rank}
            className="flex items-center gap-1 sm:gap-2 bg-white/10 rounded-lg px-2 sm:px-3 py-1 sm:py-2 min-w-[140px] sm:min-w-[180px]"
          >
            <span className="text-lg sm:text-2xl">{RANK_MEDALS[player.rank - 1]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-xs sm:text-sm truncate">
                {player.name}
              </div>
              <div className="text-white/70 text-[10px] sm:text-xs">
                {player.accuracy}%
              </div>
            </div>
            {player.hasStreak && (
              <span className="text-sm sm:text-lg" title="On a streak!">🔥</span>
            )}
          </div>
        ))}
      </div>
      <div className="text-white/50 text-[10px] sm:text-xs text-center mt-1 sm:mt-2">
        {leaderboard.totalPlayers} player{leaderboard.totalPlayers !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
