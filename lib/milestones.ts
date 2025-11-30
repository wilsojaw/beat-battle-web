// Milestone Detection and Configuration for Beat Battle

import type { MilestoneEvent, MilestoneType, Player, NoteValue } from '@/types/game';

// Accuracy threshold for "great" tap (in ms)
const GREAT_TAP_THRESHOLD = 50;

// Milestone configurations
export const MILESTONE_CONFIG = {
  streak: {
    3: { icon: '', messages: ['{name} is warming up!', '{name} found the groove!'] },
    5: { icon: '', messages: ['{name} is on fire!', '{name} can\'t miss!'] },
    10: { icon: '', messages: ['{name} is UNSTOPPABLE!', '{name} is IN THE ZONE!'] },
    15: { icon: '⭐', messages: ['{name} has a PERFECT STREAK!', '{name} is a RHYTHM GOD!'] }
  },
  accuracy: {
    80: { icon: '🎵', message: 'You\'re finding the rhythm!' },
    90: { icon: '🎯', message: 'You\'re a Rhythm Master!' },
    95: { icon: '✨', message: 'You\'re nearly perfect!' }
  },
  competitive: {
    enteredTop3: { icon: '🌟', messages: ['{name} just hit top 3!', '{name} is climbing!'] },
    becameLeader: { icon: '👑', messages: ['{name} is now in the LEAD!', '{name} took over!'] },
    closeRace: { icon: '🏃', messages: ['{name} is closing in!', '{name} is heating up!'] },
    climbingUp: { icon: '📈', messages: ['{name} is climbing the leaderboard!', '{name} is on the rise!'] }
  },
  recovery: {
    comeback: { icon: '💪', messages: ['{name} is making a comeback!', '{name} turned it around!'] },
    phoenix: { icon: '💪', messages: ['{name} rose from the ashes!', '{name} is back in it!'] }
  },
  noteSpecific: {
    mastery: { icon: '🎼', message: 'You mastered {noteType}!' }
  }
};

// Cooldown periods (in milliseconds)
export const COOLDOWN_SAME_TYPE = 10000; // 10 seconds per player per milestone type
export const COOLDOWN_GLOBAL_BROADCAST = 3000; // 3 seconds between any broadcast

/**
 * Check if a tap is considered "great" (within threshold)
 */
export function isGreatTap(accuracy: number): boolean {
  return Math.abs(accuracy) <= GREAT_TAP_THRESHOLD;
}

/**
 * Calculate current streak from tap history
 */
export function calculateCurrentStreak(taps: any[]): number {
  if (taps.length === 0) return 0;

  let streak = 0;
  for (let i = taps.length - 1; i >= 0; i--) {
    const tap = taps[i];
    // Skip first taps in segments (interval === 0 or undefined)
    if (tap.interval === 0 || tap.interval === undefined) {
      continue;
    }
    if (isGreatTap(tap.accuracy)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate rolling accuracy from last N taps
 */
export function calculateRollingAccuracy(taps: any[], count: number = 10): number {
  if (taps.length === 0) return 0;

  const recentTaps = taps.slice(-count);
  const validTaps = recentTaps.filter(tap =>
    tap.accuracy !== undefined &&
    tap.accuracy !== null &&
    tap.interval !== 0 // Exclude first taps
  );

  if (validTaps.length === 0) return 0;

  const totalAccuracy = validTaps.reduce((sum, tap) => {
    const accuracyPercent = Math.max(0, 100 - Math.abs(tap.accuracy) / 2);
    return sum + accuracyPercent;
  }, 0);

  return Math.round(totalAccuracy / validTaps.length);
}

/**
 * Get a random message from an array of messages
 */
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Format message with player name
 */
function formatMessage(template: string, playerName: string, data?: any): string {
  let message = template.replace('{name}', playerName);
  if (data?.noteType) {
    message = message.replace('{noteType}', data.noteType);
  }
  return message;
}

/**
 * Check if milestone cooldown has passed
 */
export function canTriggerMilestone(
  player: Player,
  milestoneType: string,
  cooldownMs: number = COOLDOWN_SAME_TYPE
): boolean {
  if (!player.lastMilestoneTimestamps) {
    return true;
  }

  const lastTime = player.lastMilestoneTimestamps.get(milestoneType);
  if (!lastTime) {
    return true;
  }

  return Date.now() - lastTime >= cooldownMs;
}

/**
 * Record that a milestone was triggered
 */
export function recordMilestoneTrigger(player: Player, milestoneType: string): void {
  if (!player.lastMilestoneTimestamps) {
    player.lastMilestoneTimestamps = new Map();
  }
  player.lastMilestoneTimestamps.set(milestoneType, Date.now());
}

/**
 * Check for streak milestones
 */
export function checkStreakMilestones(
  player: Player,
  currentStreak: number
): MilestoneEvent | null {
  // Check streak thresholds in descending order
  const thresholds = [15, 10, 5, 3];

  for (const threshold of thresholds) {
    if (currentStreak === threshold) {
      const config = MILESTONE_CONFIG.streak[threshold as keyof typeof MILESTONE_CONFIG.streak];
      if (!config) continue;

      const milestoneKey = `streak-${threshold}`;
      if (!canTriggerMilestone(player, milestoneKey)) {
        return null;
      }

      const message = formatMessage(getRandomMessage(config.messages), player.name);

      recordMilestoneTrigger(player, milestoneKey);

      return {
        id: `${player.id}-${milestoneKey}-${Date.now()}`,
        type: 'streak',
        playerId: player.id,
        playerName: player.name,
        message: `${message} ${config.icon}`,
        icon: config.icon,
        broadcast: true,
        timestamp: Date.now(),
        data: { streakCount: threshold }
      };
    }
  }

  return null;
}

/**
 * Check for accuracy milestones (personal only)
 */
export function checkAccuracyMilestones(
  player: Player,
  accuracy: number
): MilestoneEvent | null {
  // Check accuracy thresholds in descending order
  const thresholds = [95, 90, 80];

  for (const threshold of thresholds) {
    if (accuracy >= threshold) {
      const config = MILESTONE_CONFIG.accuracy[threshold as keyof typeof MILESTONE_CONFIG.accuracy];
      if (!config) continue;

      const milestoneKey = `accuracy-${threshold}`;
      if (!canTriggerMilestone(player, milestoneKey)) {
        return null;
      }

      recordMilestoneTrigger(player, milestoneKey);

      return {
        id: `${player.id}-${milestoneKey}-${Date.now()}`,
        type: 'accuracy',
        playerId: player.id,
        playerName: player.name,
        message: `${config.message} ${config.icon}`,
        icon: config.icon,
        broadcast: false, // Personal only
        timestamp: Date.now(),
        data: { accuracyPercent: accuracy }
      };
    }
  }

  return null;
}

/**
 * Check for competitive milestones (rank changes)
 */
export function checkCompetitiveMilestones(
  player: Player
): MilestoneEvent | null {
  const currentRank = player.currentRank || 0;
  const previousRank = player.previousRank || 0;

  // No rank change or ranks not set
  if (currentRank === 0 || previousRank === 0 || currentRank === previousRank) {
    return null;
  }

  // Became leader (rank 1)
  if (currentRank === 1 && previousRank > 1) {
    const config = MILESTONE_CONFIG.competitive.becameLeader;
    const milestoneKey = 'became-leader';

    if (!canTriggerMilestone(player, milestoneKey)) {
      return null;
    }

    const message = formatMessage(getRandomMessage(config.messages), player.name);
    recordMilestoneTrigger(player, milestoneKey);

    return {
      id: `${player.id}-${milestoneKey}-${Date.now()}`,
      type: 'competitive',
      playerId: player.id,
      playerName: player.name,
      message: `${message} ${config.icon}`,
      icon: config.icon,
      broadcast: true,
      timestamp: Date.now(),
      data: { currentRank, previousRank }
    };
  }

  // Entered top 3
  if (currentRank <= 3 && previousRank > 3) {
    const config = MILESTONE_CONFIG.competitive.enteredTop3;
    const milestoneKey = 'entered-top3';

    if (!canTriggerMilestone(player, milestoneKey)) {
      return null;
    }

    const message = formatMessage(getRandomMessage(config.messages), player.name);
    recordMilestoneTrigger(player, milestoneKey);

    return {
      id: `${player.id}-${milestoneKey}-${Date.now()}`,
      type: 'competitive',
      playerId: player.id,
      playerName: player.name,
      message: `${message} ${config.icon}`,
      icon: config.icon,
      broadcast: true,
      timestamp: Date.now(),
      data: { currentRank, previousRank }
    };
  }

  // Climbing up (moved up 2+ ranks)
  if (previousRank - currentRank >= 2) {
    const config = MILESTONE_CONFIG.competitive.climbingUp;
    const milestoneKey = 'climbing-up';

    if (!canTriggerMilestone(player, milestoneKey)) {
      return null;
    }

    const message = formatMessage(getRandomMessage(config.messages), player.name);
    recordMilestoneTrigger(player, milestoneKey);

    return {
      id: `${player.id}-${milestoneKey}-${Date.now()}`,
      type: 'competitive',
      playerId: player.id,
      playerName: player.name,
      message: `${message} ${config.icon}`,
      icon: config.icon,
      broadcast: true,
      timestamp: Date.now(),
      data: { currentRank, previousRank, ranksClimbed: previousRank - currentRank }
    };
  }

  return null;
}

/**
 * Check for recovery milestones
 */
export function checkRecoveryMilestones(
  player: Player,
  currentAccuracy: number,
  totalPlayers: number
): MilestoneEvent | null {
  // For now, we'll implement this later when we have historical accuracy tracking
  // This would require tracking accuracy over time to detect comebacks
  return null;
}

/**
 * Main function to check all milestones for a player
 */
export function checkAllMilestones(
  player: Player,
  currentStreak: number,
  currentAccuracy: number,
  totalPlayers: number
): MilestoneEvent[] {
  const milestones: MilestoneEvent[] = [];

  // Check streak milestones
  const streakMilestone = checkStreakMilestones(player, currentStreak);
  if (streakMilestone) {
    milestones.push(streakMilestone);
  }

  // Check accuracy milestones
  const accuracyMilestone = checkAccuracyMilestones(player, currentAccuracy);
  if (accuracyMilestone) {
    milestones.push(accuracyMilestone);
  }

  // Check competitive milestones
  const competitiveMilestone = checkCompetitiveMilestones(player);
  if (competitiveMilestone) {
    milestones.push(competitiveMilestone);
  }

  // Check recovery milestones
  const recoveryMilestone = checkRecoveryMilestones(player, currentAccuracy, totalPlayers);
  if (recoveryMilestone) {
    milestones.push(recoveryMilestone);
  }

  return milestones;
}
