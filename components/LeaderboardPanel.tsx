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
      relative
      sm:bg-black/30 sm:backdrop-blur-md sm:rounded-xl
      p-0 sm:p-3
      sm:border sm:border-white/20 sm:shadow-xl
      max-w-full sm:max-w-none
      z-10
      mt-0 sm:mt-0
    ">
      <div className="text-white/80 text-[clamp(10px,2.5vw,14px)] sm:text-xs font-semibold mb-0.5 sm:mb-2 text-center">
        TOP 3
      </div>
      <div className="flex flex-row sm:flex-col gap-1 sm:space-y-2 justify-center sm:justify-start">
        {leaderboard.topPlayers.map((player) => (
          <div
            key={player.rank}
            className="flex items-center gap-0.5 sm:gap-2 sm:bg-white/10 sm:rounded-lg px-1 sm:px-3 py-0.5 sm:py-2 min-w-0 sm:min-w-[180px]"
          >
            <span className="text-[clamp(16px,4vw,24px)] sm:text-2xl">{RANK_MEDALS[player.rank - 1]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-[clamp(10px,2.5vw,14px)] sm:text-sm truncate">
                {player.name}
              </div>
              <div className="text-white/70 text-[clamp(9px,2vw,12px)] sm:text-xs">
                {player.accuracy}%
              </div>
            </div>
            {player.hasStreak && (
              <span className="text-sm sm:text-lg" title="On a streak!"></span>
            )}
          </div>
        ))}
      </div>
      <div className="text-white/50 text-[clamp(9px,2vw,12px)] sm:text-xs text-center mt-0.5 sm:mt-2">
        {leaderboard.totalPlayers} player{leaderboard.totalPlayers !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
