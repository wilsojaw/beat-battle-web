# Student Stats & Milestones - Design Document

## Overview
Add real-time competitive stats and achievement milestones to student game screens to increase engagement and motivation. Students will see top performers, their own progress, and fun milestone notifications like "Jacob is on fire!" or "Destiny is climbing up!"

## Goals
1. **Increase engagement** - Give students visibility into how they're performing relative to peers
2. **Celebrate achievements** - Recognize streaks, improvements, and standout performances
3. **Maintain focus** - Keep notifications fun but non-disruptive to gameplay
4. **Drive motivation** - Encourage students to improve through friendly competition

---

## 1. Live Stats to Display

### 1.1 Top 3 Leaderboard (Real-time)
**Location:** Top-right corner or side panel on student game screen

**Data to show:**
- Rank (1st, 2nd, 3rd with medals 🥇🥈🥉)
- Player name
- Current accuracy %
- Optional: Streak indicator (🔥 if on streak)

**Update frequency:** Every 2-3 seconds (to avoid overwhelming updates)

**Visual design:**
```
┌─ TOP PERFORMERS ────┐
│ 🥇 Destiny    98%   │
│ 🥈 Jacob      94%   │
│ 🥉 Marcus     91%   │
└─────────────────────┘
```

### 1.2 Personal Stats Panel
**Current data (already shown):**
- Current accuracy %

**New data to add:**
- Current streak count (consecutive "great" taps)
- Personal best accuracy this session
- Rank indicator (e.g., "#4 of 12")

---

## 2. Milestone System

### 2.1 Milestone Categories

#### A. Streak Milestones
**Definition:** Consecutive "great" taps (±50ms accuracy)

| Milestone | Threshold | Message Template | Icon |
|-----------|-----------|------------------|------|
| Hot Start | 3 in a row | "{name} is warming up! 🔥" | 🔥 |
| On Fire | 5 in a row | "{name} is on fire! 🔥🔥" | 🔥🔥 |
| Unstoppable | 10 in a row | "{name} is UNSTOPPABLE! 🔥🔥🔥" | 🔥🔥🔥 |
| Perfect Streak | 15 in a row | "{name} has a PERFECT STREAK! ⭐" | ⭐ |

**Broadcast:** Show to all students when triggered

#### B. Accuracy Milestones
**Definition:** Overall session accuracy thresholds

| Milestone | Threshold | Message Template | Icon |
|-----------|-----------|------------------|------|
| Solid Start | 80% | "{name} is finding the rhythm! 🎵" | 🎵 |
| Rhythm Master | 90% | "{name} is a Rhythm Master! 🎯" | 🎯 |
| Perfection | 95%+ | "{name} is nearly perfect! ✨" | ✨ |

**Broadcast:** Only to the achieving student (personal milestone)

#### C. Competitive Milestones
**Definition:** Rank changes and competitive achievements

| Milestone | Trigger | Message Template | Icon |
|-----------|---------|------------------|------|
| Climbing Up | Moved up 2+ ranks | "{name} is climbing the leaderboard! 📈" | 📈 |
| Top 3 Entry | Entered top 3 | "{name} just hit top 3! 🌟" | 🌟 |
| Leader Takeover | Became #1 | "{name} is now in the LEAD! 👑" | 👑 |
| Close Race | Within 5% of #1 | "{name} is closing in on the leader! 🏃" | 🏃 |

**Broadcast:** Show to all students

#### D. Note-Specific Milestones
**Definition:** Mastery of specific note values

| Milestone | Trigger | Message Template | Icon |
|-----------|---------|------------------|------|
| Note Mastery | 95%+ on specific note | "{name} mastered {noteType}! 🎼" | 🎼 |

**Broadcast:** Only to the achieving student

#### E. Recovery Milestones
**Definition:** Comeback achievements

| Milestone | Trigger | Message Template | Icon |
|-----------|---------|------------------|------|
| Comeback Kid | Improved 15%+ | "{name} is making a comeback! 💪" | 💪 |
| Phoenix Rising | Went from bottom 3 to top 5 | "{name} rose from the ashes! 🔥" | 🔥 |

**Broadcast:** Show to all students

### 2.2 Milestone Cooldown
To prevent spam:
- **Same milestone type:** 10 seconds cooldown per player
- **Global milestone broadcast:** 3 seconds between any milestone notifications
- **Personal milestones:** No cooldown (only shown to that student)

---

## 3. UI/UX Design

### 3.1 Milestone Notification Display

**Option A: Toast Notification (Recommended)**
- Appears at top-center of screen
- Slides in, stays for 3 seconds, slides out
- Semi-transparent background with blur
- Large emoji + text
- Doesn't block tap area

```
┌─────────────────────────────────────┐
│  🔥🔥  Jacob is on fire!  🔥🔥       │
└─────────────────────────────────────┘
```

**Option B: Side Banner**
- Appears on left or right side
- Stacks multiple notifications
- Auto-dismisses after 3 seconds

### 3.2 Leaderboard Position

**Option 1: Compact Corner Panel (Recommended)**
```
┌─ Student Game Screen ────────────────────────┐
│ Top Bar                                      │
│ [Name] [Room] [Measure] [Accuracy]           │
│                                    ┌─ TOP 3 ┐│
│                                    │🥇 Des 98││
│                                    │🥈 Jac 94│ │
│         [Large Note Symbol]        │🥉 Mar 91││
│                                    └─────────┘│
│                                              │
│         [Tap to play!]                       │
│                                              │
│         [Next Note Preview]                  │
└──────────────────────────────────────────────┘
```

**Option 2: Integrated Top Bar**
- Add "Your Rank: #4 / 12" next to accuracy
- Expand top bar slightly
- Less visual clutter

### 3.3 Streak Indicator (Personal)
Add to personal stats area:
```
Accuracy: 94%  |  Streak: 7 🔥  |  Rank: #2
```

---

## 4. Data Structures

### 4.1 Extended Player Type
```typescript
export interface Player {
  id: string;
  name: string;
  isTeacher: boolean;
  accuracy?: number;
  score?: number;
  taps?: TapEvent[];

  // NEW: Real-time stats
  currentStreak: number;          // Current consecutive "great" taps
  bestStreak: number;             // Best streak this session
  currentRank: number;            // Live ranking position
  previousRank: number;           // Rank from last update (for change detection)
  recentAccuracies: number[];     // Last 10 tap accuracies for rolling average
  noteTypeAccuracies: Map<NoteValue, number[]>; // Accuracies grouped by note type
  achievedMilestones: Set<string>; // Track which milestones already triggered
}
```

### 4.2 Milestone Event Type
```typescript
export interface MilestoneEvent {
  id: string;                    // Unique ID for this milestone instance
  type: MilestoneType;           // 'streak' | 'accuracy' | 'competitive' | 'note-specific' | 'recovery'
  playerId: string;
  playerName: string;
  message: string;               // Pre-formatted message to display
  icon: string;                  // Emoji icon
  broadcast: boolean;            // true = all students, false = only this student
  timestamp: number;             // When it was triggered
  data?: any;                    // Additional context (e.g., streak count, note type)
}

export type MilestoneType =
  | 'streak'
  | 'accuracy'
  | 'competitive'
  | 'note-specific'
  | 'recovery';
```

### 4.3 Leaderboard Update Event
```typescript
export interface LeaderboardUpdate {
  topPlayers: Array<{           // Top 3 players
    rank: number;
    name: string;
    accuracy: number;
    hasStreak: boolean;
  }>;
  totalPlayers: number;
  timestamp: number;
}
```

---

## 5. Socket Events (New)

### 5.1 Server → Students

#### `leaderboard-update`
**When:** Every 2-3 seconds during active game
**Payload:**
```javascript
{
  topPlayers: [
    { rank: 1, name: "Destiny", accuracy: 98, hasStreak: true },
    { rank: 2, name: "Jacob", accuracy: 94, hasStreak: false },
    { rank: 3, name: "Marcus", accuracy: 91, hasStreak: false }
  ],
  totalPlayers: 12,
  timestamp: 1234567890
}
```

#### `milestone-achieved`
**When:** When any player triggers a milestone
**Payload:**
```javascript
{
  type: 'streak',
  playerId: 'socket-id-123',
  playerName: 'Jacob',
  message: 'Jacob is on fire! 🔥🔥',
  icon: '🔥🔥',
  broadcast: true,
  data: { streakCount: 5 }
}
```

#### `personal-stats-update`
**When:** After each tap by this student
**Payload:**
```javascript
{
  currentStreak: 7,
  bestStreak: 12,
  currentRank: 2,
  previousRank: 3,
  accuracy: 94
}
```

---

## 6. Implementation Plan

### Phase 1: Server-Side Stats Tracking
**Files:** `server.js`

**Tasks:**
1. Extend `Player` interface with new stat fields
2. Add helper functions:
   - `calculateCurrentStreak(taps)`
   - `calculateRollingAccuracy(taps, count = 10)`
   - `updatePlayerRankings(game)`
   - `checkMilestones(player, game)` - returns array of triggered milestones
3. Modify `submit-tap` handler to:
   - Update player stats on each tap
   - Check for milestone triggers
   - Emit `milestone-achieved` if triggered
   - Emit `personal-stats-update` to tapping student
4. Add interval timer (every 2-3s) to:
   - Recalculate rankings
   - Emit `leaderboard-update` to all students

### Phase 2: Types & Constants
**Files:** `types/game.ts`, `lib/milestones.ts` (new)

**Tasks:**
1. Add new TypeScript interfaces (Player extensions, MilestoneEvent, etc.)
2. Create `lib/milestones.ts` with:
   - Milestone configuration constants
   - Helper functions for milestone detection
   - Message template generators

### Phase 3: Student Game UI
**Files:** `app/student/game/page.tsx`

**Tasks:**
1. Add state for:
   - `leaderboard: LeaderboardUpdate | null`
   - `milestones: MilestoneEvent[]` (queue for display)
   - `personalStats: PersonalStats | null`
2. Add socket listeners:
   - `leaderboard-update`
   - `milestone-achieved`
   - `personal-stats-update`
3. Create components:
   - `<LeaderboardPanel />` - Top 3 display
   - `<MilestoneToast />` - Notification popup
   - `<StreakIndicator />` - Streak count in header
4. Update existing header to show rank

### Phase 4: Testing & Refinement
**Tasks:**
1. Test with multiple students in same room
2. Verify milestone triggers work correctly
3. Adjust cooldowns and thresholds based on feel
4. Polish animations and transitions
5. Test performance with 20+ students

### Phase 5: Configuration Options
**Files:** `types/game.ts`, `app/teacher/setup/page.tsx`

**Tasks:**
1. Add to GameConfig:
   - `showLiveLeaderboard: boolean`
   - `enableMilestones: boolean`
   - `milestoneTypes: MilestoneType[]` (let teachers choose which to enable)
2. Update teacher setup page to allow toggling these features

---

## 7. Open Questions & Decisions Needed

### 7.1 Privacy Considerations
**Question:** Should students see everyone's names in leaderboard, or anonymize (e.g., "Player 1", "Player 2")?
- **Recommendation:** Show real names (it's a classroom setting, teacher is monitoring)

### 7.2 Leaderboard Visibility
**Question:** Should all students see the leaderboard, or only top 5?
- **Recommendation:** All students see top 3, plus their own rank

### 7.3 Milestone Broadcast vs Personal
**Question:** Which milestones should be broadcast to everyone vs. personal only?
- **Recommendation (in table above):** Competitive/streak = broadcast, accuracy/note-specific = personal

### 7.4 Visual Intensity
**Question:** How flashy should milestone notifications be?
- **Recommendation:** Subtle animations - game is about tapping rhythm, don't distract too much

### 7.5 Teacher Dashboard
**Question:** Should teachers see a similar leaderboard on their screen?
- **Recommendation:** Yes! Add to teacher game view in Phase 4

---

## 8. Example User Flow

### Student Joins Game
1. Student taps and starts building accuracy
2. After 3rd consecutive "great" tap → **Personal notification:** "You're warming up! 🔥"
3. Leaderboard shows top 3 players (updated every 3s)
4. Student's accuracy improves, moves from rank #8 to #4
5. Student gets to #3 → **Broadcast to all:** "Jacob just hit top 3! 🌟"
6. Student maintains 95% accuracy → **Personal notification:** "You're nearly perfect! ✨"
7. Top-right panel always shows current top 3, student's header shows their rank

### Multiple Students Competing
1. Destiny is #1 with 98%, Jacob is #2 with 94%
2. Jacob hits a 10-tap perfect streak → **Broadcast:** "Jacob is UNSTOPPABLE! 🔥🔥🔥"
3. Marcus improves from 75% to 91% → **Broadcast:** "Marcus is making a comeback! 💪"
4. All students see live top 3 updating every 3 seconds

---

## 9. Success Metrics

After implementation, measure:
1. **Engagement:** Do students tap more consistently when stats are visible?
2. **Accuracy improvement:** Do milestone notifications correlate with better performance?
3. **Session completion:** Do more students finish the full game?
4. **Teacher feedback:** Do teachers find it enhances or distracts from learning?

---

## 10. Future Enhancements (Post-MVP)

1. **Achievement badges** - Persistent badges for rare achievements
2. **Session summary** - Show milestones achieved on results screen
3. **Class leaderboard** - Across multiple game sessions
4. **Customizable messages** - Let teachers write their own milestone messages
5. **Sound effects** - Optional audio cues for milestones (with teacher control)
6. **Animations** - Confetti or particle effects for major milestones
7. **Team mode** - Split class into teams, show team stats

---

## Technical Notes

### Performance Considerations
- Leaderboard recalculation: O(n log n) for sorting, acceptable for classroom size (< 50 students)
- Milestone checking: O(1) per tap with proper data structures
- Socket events: Throttle leaderboard updates to avoid overwhelming clients
- Use React.memo for leaderboard component to prevent unnecessary re-renders

### Accessibility
- Use ARIA live regions for milestone announcements (screen reader support)
- Ensure leaderboard text has sufficient contrast
- Provide option to disable animations (motion sensitivity)

### Browser Compatibility
- Test toast notifications on mobile Safari (iOS) and Chrome (Android)
- Ensure touch events don't conflict with milestone displays
- Test with slow connections (milestone queue might back up)

---

## Appendix: Example Milestone Messages

```javascript
const MILESTONE_MESSAGES = {
  streak: {
    3: ["{name} is warming up! 🔥", "{name} found the groove! 🎵"],
    5: ["{name} is on fire! 🔥🔥", "{name} can't miss! 🎯"],
    10: ["{name} is UNSTOPPABLE! 🔥🔥🔥", "{name} is IN THE ZONE! ⚡"],
    15: ["{name} has a PERFECT STREAK! ⭐", "{name} is a RHYTHM GOD! 👑"]
  },
  competitive: {
    enteredTop3: ["{name} just hit top 3! 🌟", "{name} is climbing! 📈"],
    becameLeader: ["{name} is now in the LEAD! 👑", "{name} took over! 🚀"],
    closeRace: ["{name} is closing in! 🏃", "{name} is heating up! 🔥"]
  },
  recovery: {
    comeback: ["{name} is making a comeback! 💪", "{name} turned it around! 🔄"],
    phoenix: ["{name} rose from the ashes! 🔥", "{name} is back in it! 🎯"]
  }
};
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Authors:** Design for Beat Battle rhythm learning game
