# Beat Battle Architecture Documentation

**Last Updated:** November 24, 2024

## Project Overview

Beat Battle is a real-time multiplayer rhythm learning game for music education. Teachers configure and run live sessions where students tap rhythms on their devices while the system tracks accuracy and provides feedback.

## Current Architecture (Post Phase 1-5 Refactor)

### Single-Page View-Based Architecture

The application was refactored from a multi-page navigation model to a single-page, view-based architecture to maintain persistent socket connections and improve state management.

**Teacher Flow:**
- `/teacher` - Single page with view states: `setup` → `lobby` → `countdown` → `playing` → `results`

**Student Flow:**
- `/student` - Single page with view states: `join` → `waiting` → `countdown` → `playing` → `results`

### State Management (Zustand)

Three primary stores manage application state:

1. **`socketStore`** (`store/socketStore.ts`)
   - Socket connection state
   - Socket ID
   - Connection status
   - Clock synchronization offset

2. **`teacherStore`** (`store/teacherStore.ts`)
   - Current view state
   - Room code
   - Teacher name
   - Game configuration
   - Player list
   - Game data (segments, timing)
   - Countdown state

3. **`studentStore`** (`store/studentStore.ts`)
   - Current view state
   - Room code
   - Player name
   - Player count
   - Game data (segments, timing)
   - Current/next segments
   - Tap history
   - Leaderboard data
   - Milestones
   - Countdown state

### Socket.io Event System

**Central Event Manager:** `components/SocketManager.tsx`
- Mounted at app root (`app/layout.tsx`)
- Registers all socket event listeners on mount
- Uses named functions for proper cleanup
- Updates both student and teacher stores where applicable

**Key Socket Events:**

**Room Management:**
- `create-game` - Teacher creates room
- `join-game` - Student joins with code
- `leave-game` - Student leaves room
- `teacher-rejoin` / `student-rejoin` - Reconnect after navigation

**Game Flow:**
- `start-game` - Teacher starts game
- `countdown-start` - 3-2-1 countdown begins
- `countdown-tick` - Countdown updates
- `game-started` - Game begins, includes segments and timing
- `submit-tap` - Student submits tap event
- `end-game` - Teacher ends game
- `game-ended` - Results broadcast

**State Updates:**
- `player-joined` - Broadcast when player joins
- `player-left` - Broadcast when player leaves
- `player-count-update` - Individual count update
- `segment-changed` - Note value changes
- `player-tap` - Broadcast tap to teacher
- `leaderboard-update` - Live leaderboard changes
- `milestone-achieved` - Player milestone notification

### Component Structure

**Teacher Components:**
- `app/teacher/page.tsx` - Main teacher page
- `components/teacher/SetupView.tsx` - Game configuration
- `components/teacher/LobbyView.tsx` - Waiting room
- `components/teacher/CountdownView.tsx` - 3-2-1 countdown
- `components/teacher/PlayingView.tsx` - Game monitoring
- `components/teacher/ResultsView.tsx` - Game results

**Student Components:**
- `app/student/page.tsx` - Main student page
- `components/student/JoinView.tsx` - Enter room code
- `components/student/LobbyView.tsx` - Waiting room
- `components/student/CountdownView.tsx` - 3-2-1 countdown
- `components/student/PlayingView.tsx` - Game interface
- `components/student/ResultsView.tsx` - Personal results

**Shared Components:**
- `components/SocketManager.tsx` - Central event handler
- `components/LeaderboardPanel.tsx` - Live leaderboard display
- `components/MilestoneToast.tsx` - Achievement notifications

### Timing & Rhythm System

**RhythmEngine** (`lib/rhythm-engine.ts`)
- Uses Tone.js (Web Audio API wrapper)
- Tempo-based timing calculations
- Metronome functionality (teacher only)
- Tap accuracy calculations based on intervals

**Key Concepts:**
- Students do NOT use audio - they listen to teacher's speakers
- RhythmEngine on student side is only for timing calculations
- Clock synchronization via ping-pong protocol to sync client/server time
- Measure-based game duration (not arbitrary time)

**Accuracy Calculation:**
- Interval-based: compares actual time between taps vs expected
- Expected interval = `(60 / tempo) / tapsPerBeat * 1000` ms
- Thresholds: Great (±30ms), Good (±75ms), Miss (≥75ms)

### Server Architecture

**Custom Server** (`server.js`)
- Combines Next.js with Socket.io
- In-memory game state (Map-based, ephemeral)
- Segment generation based on measures and tempo
- Results calculation on game end
- Timing data export in tab-separated CSV format for Excel

**Game State:**
```javascript
{
  roomCode: string,
  config: GameConfig,
  players: Player[],
  status: 'lobby' | 'countdown' | 'playing' | 'finished',
  segments: GameSegment[],
  currentSegment: GameSegment,
  startTime: number, // Date.now() when game starts
  teacher: Player
}
```

**Segment Generation:**
- Based on total measures and measures per segment
- Each segment has: noteValue, startTime, endTime
- Server calculates timing windows based on tempo and measures

## Current Issues

### Critical: Safari Compatibility (UNRESOLVED)

**Problem:** Safari student clients get stuck on "Get Ready!" screen and never transition to playing view.

**Symptoms:**
- Countdown completes successfully
- `game-started` socket event fires
- Rhythm engine initialization logs appear (sometimes twice)
- No "Rhythm engine initialized successfully" log
- No error logs
- UI stays on "Get Ready!" screen
- 0 taps recorded for Safari students

**Safari Console Logs:**
```
[Log] [Socket] Game started: – Object
[Log] [useStudentGame] Initializing rhythm engine with tempo: – 100
[Log] [useStudentGame] Initializing rhythm engine with tempo: – 100 (sometimes)
[Log] [Student] Leaderboard update: – Object (continues)
```

**Investigation History:**
1. Initial hypothesis: Double initialization causing race condition
   - Fix: Added `if (rhythmEngineRef.current) return;` guard
   - Result: Prevented double init, but Safari still stuck

2. Second hypothesis: Tone.js audio context blocked by Safari autoplay policy
   - Issue: `await Tone.start()` appears to hang in Safari
   - Fix attempted: Move `setIsPlaying(true)` outside try/catch
   - Result: Still stuck (init() may be hanging indefinitely)

3. Current hypothesis: `await rhythmEngineRef.current.init()` hangs in Safari, blocking all subsequent code
   - Students don't need audio (listen to teacher's speakers)
   - Only need timing calculations, not Tone.js audio context
   - May need to skip Tone.js initialization entirely for students

**Latest Fix (Not Yet Tested):**
- Moved `setIsPlaying(true)` to run regardless of Tone.js init success
- Should allow game to start even if audio context fails
- Located in `hooks/useStudentGame.ts` lines 58-68

### Issue: Measure Display Shows Wrong Numbers

**Problem:** Student screen shows "134/16" instead of "1/16" during gameplay.

**Expected:** Measure counter should show 0 during count-in, then 1-16 during game
**Actual:** Shows numbers in the 100s (e.g., 134, 105, etc.)

**Calculation Logic:**
```javascript
const elapsed = getSyncedTime() - gameData.startTime;
const currentMeasureNum = Math.floor((elapsed - countInDuration) / measureDuration) + 1;
```

**Possible Causes:**
- `getSyncedTime()` returning incorrect value
- `gameData.startTime` not set correctly
- Clock offset calculation issue
- Timing desynchronization after reconnect

**Debug Logging Added:**
```javascript
if (elapsed > 1000000) {
  console.error('[useStudentGame] Invalid elapsed time:', {
    syncedTime, startTime, elapsed, clockOffset
  });
}
```

### Working Features

✅ Chrome desktop - Full functionality
✅ Teacher screen - All views and controls
✅ Room creation and joining
✅ Socket.io communication
✅ Clock synchronization
✅ Countdown sequence
✅ Live leaderboard updates
✅ Milestone notifications
✅ Tap accuracy calculations (Chrome)
✅ Results calculation and display
✅ Excel CSV timing export
✅ 4-digit numeric room codes (1000-9999)
✅ Measure-based game duration
✅ Duration preview on setup page
✅ Metronome (teacher side)

### Not Yet Tested

⏳ Safari desktop
⏳ Safari mobile (iPhone/iPad)
⏳ Chrome mobile (Android/iOS)
⏳ Multiple simultaneous students
⏳ Network reliability (poor connections)
⏳ Game state recovery after refresh

## Technical Decisions & Notes

### Why Single-Page Architecture?

**Problem with multi-page navigation:**
- Socket connections were being dropped during page transitions
- State loss between pages
- Complex rejoin logic required
- Timing synchronization issues

**Benefits of view-based approach:**
- Persistent socket connection throughout session
- Centralized state management
- Simpler event handling
- Better timing consistency

### Why Zustand Over Context API?

- Better performance (selective subscriptions)
- Simpler API
- No provider wrapper needed
- External store updates (socket events)

### Why Custom Server?

- Next.js dev server doesn't support Socket.io
- Need WebSocket for real-time communication
- Game state management in memory
- Server-side timing calculations

### Game Duration: Measures vs Time

**Design Decision:** Game duration is based on MEASURES, not arbitrary time.

**Rationale:**
- Musicians think in measures, not seconds
- Allows future support for different time signatures (3/4, 6/8, etc.)
- Duration calculated as: `measures × beatsPerMeasure × (60/tempo)`

**Current Implementation:**
- 4/4 time signature hardcoded
- TODO comments in code for time signature expansion
- Duration display on setup page shows calculated time

### Audio Architecture

**Teacher:**
- Uses Tone.js for metronome playback
- Audio plays through classroom speakers
- Students listen to this audio

**Student:**
- NO audio playback
- RhythmEngine used ONLY for timing calculations
- Tone.js initialization should be optional/skippable
- Students hear teacher's audio in classroom

## File Structure

```
beat-battle-web/
├── app/
│   ├── layout.tsx              # Root layout with SocketManager
│   ├── page.tsx                # Home page (I'm a Teacher / I'm a Student)
│   ├── teacher/
│   │   └── page.tsx            # Teacher single-page app
│   └── student/
│       └── page.tsx            # Student single-page app
├── components/
│   ├── SocketManager.tsx       # Central socket event manager
│   ├── LeaderboardPanel.tsx    # Shared leaderboard component
│   ├── MilestoneToast.tsx      # Achievement notifications
│   ├── teacher/
│   │   ├── SetupView.tsx
│   │   ├── LobbyView.tsx
│   │   ├── CountdownView.tsx
│   │   ├── PlayingView.tsx
│   │   └── ResultsView.tsx
│   └── student/
│       ├── JoinView.tsx
│       ├── LobbyView.tsx
│       ├── CountdownView.tsx
│       ├── PlayingView.tsx
│       └── ResultsView.tsx
├── hooks/
│   ├── useStudentGame.ts       # Student gameplay logic
│   └── useTeacherGame.ts       # Teacher game monitoring logic
├── store/
│   ├── socketStore.ts          # Socket connection state
│   ├── teacherStore.ts         # Teacher app state
│   └── studentStore.ts         # Student app state
├── lib/
│   ├── socket.ts               # Socket singleton
│   ├── rhythm-engine.ts        # Tone.js wrapper
│   └── clock-sync.ts           # Client/server time sync
├── types/
│   └── game.ts                 # TypeScript definitions
├── server.js                   # Custom Next.js + Socket.io server
├── CLAUDE.md                   # Development instructions
├── DEPLOYMENT.md               # Railway deployment guide
└── ARCHITECTURE.md             # This file
```

## Next Steps

### Immediate Priority: Fix Safari

**Option 1: Skip Tone.js for Students**
- Remove `await rhythmEngineRef.current.init()` call for students
- Keep RhythmEngine instance for calculations only
- Only initialize Tone.js on teacher side

**Option 2: Make Tone.js Initialization Non-Blocking**
- Use timeout wrapper around `init()`
- Proceed after 500ms regardless of success
- Log warning if audio unavailable

**Option 3: Separate Timing Engine**
- Create `TimingEngine` class without Tone.js dependency
- Use for students (pure JavaScript timing)
- Keep `RhythmEngine` with Tone.js for teachers

### Fix Measure Display Bug

1. Add debug logging to identify source of invalid times
2. Test Safari with debug logs
3. Verify `gameData.startTime` format and value
4. Check clock sync offset calculation
5. Ensure measure calculation uses milliseconds consistently

### Testing Checklist

Once Safari is fixed:
- [ ] Safari desktop (teacher + student)
- [ ] Safari mobile iPhone
- [ ] Safari mobile iPad
- [ ] Chrome mobile Android
- [ ] Chrome mobile iOS
- [ ] 2-5 simultaneous students
- [ ] 10+ simultaneous students
- [ ] Network disconnect/reconnect
- [ ] Page refresh during game
- [ ] Teacher disconnect handling

### Future Enhancements

- **Persistent Game State:** Database instead of in-memory Map
- **Time Signature Support:** 3/4, 6/8, etc.
- **Game Templates:** Pre-configured difficulty levels
- **Student Analytics:** Long-term progress tracking
- **Replay Mode:** Review past games
- **Custom Note Sequences:** Teacher-defined patterns
- **Audio Upload:** Custom backing tracks

## Known Limitations

- Game state is ephemeral (server restart = data loss)
- Only 4/4 time signature supported
- No authentication/authorization
- No game history persistence
- Room codes recycled on server restart
- Clock sync runs once at connection (no periodic re-sync)
- No bandwidth optimization (all tap data sent to server)

## Development Commands

```bash
# Development (MUST use custom server)
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

**IMPORTANT:** Always use `npm run dev`, NOT `next dev`. The custom Socket.io server in `server.js` is required.

## Deployment

See `DEPLOYMENT.md` for Railway deployment instructions.

**Key Environment Variables:**
- `PORT=8080` (Railway requirement)
- `NODE_ENV=production`

## Browser Compatibility Target

- Chrome 90+ ✅
- Safari 14+ ⚠️ (Issues)
- Firefox 88+ (Not tested)
- Edge 90+ (Not tested)
- Mobile Safari iOS 14+ (Not tested)
- Chrome Android 90+ (Not tested)

---

## Refactor Summary

The Phase 1-5 refactor successfully implemented:

✅ Single-page architecture (no navigation during gameplay)
✅ Centralized state management (Zustand)
✅ Persistent socket connections (SocketManager at root)
✅ Named function pattern for proper cleanup
✅ Clock synchronization for accurate timing
✅ Measure-based game duration
✅ Live leaderboard and milestones
✅ Excel CSV export for timing analysis

**Regression introduced:**
❌ Safari compatibility broken (was working before refactor)

**Root cause of Safari issue:**
The refactor introduced a dependency on Tone.js initialization that blocks the game UI from starting in Safari. The pre-refactor code may have handled this differently or used different timing mechanisms.

**Next action:**
Compare pre-refactor Safari handling with current implementation to identify what changed and why Safari is now blocked.

---

**Note:** This document reflects the state after Phase 1-5 refactor completion. Safari compatibility is the primary blocker preventing production deployment.
