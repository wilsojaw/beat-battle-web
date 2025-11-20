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
    <div className="absolute top-20 right-4 bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/20 shadow-xl">
      <div className="text-white/80 text-xs font-semibold mb-2 text-center">
        TOP PERFORMERS
      </div>
      <div className="space-y-2">
        {leaderboard.topPlayers.map((player) => (
          <div
            key={player.rank}
            className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 min-w-[180px]"
          >
            <span className="text-2xl">{RANK_MEDALS[player.rank - 1]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm truncate">
                {player.name}
              </div>
              <div className="text-white/70 text-xs">
                {player.accuracy}%
              </div>
            </div>
            {player.hasStreak && (
              <span className="text-lg" title="On a streak!">🔥</span>
            )}
          </div>
        ))}
      </div>
      <div className="text-white/50 text-xs text-center mt-2">
        {leaderboard.totalPlayers} player{leaderboard.totalPlayers !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
