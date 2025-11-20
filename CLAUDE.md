# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beat Battle is a real-time multiplayer rhythm learning game for music education. Teachers configure and run live sessions where students tap rhythms on their devices while the system tracks accuracy and provides feedback. Think Guitar Hero meets Kahoot for rhythm training.

## Essential Commands

```bash
# Development (uses custom server with Socket.io)
npm run dev

# Production build and start
npm run build
npm start

# Linting
npm run lint
```

**IMPORTANT**: Always use `npm run dev` (not `next dev`) because the app requires the custom Socket.io server in `server.js`.

## Architecture

### Real-Time Multiplayer Game Flow

1. **Teacher creates game** → Server generates room code and stores game state in memory (`games` Map in server.js)
2. **Students join** → Emit `join-game` event, added to game's player array
3. **Teacher starts** → Server emits `game-started` with segments and timing
4. **Students tap** → Client calculates accuracy locally, sends `submit-tap` to server
5. **Teacher ends** → Server calculates results, emits `game-ended` with leaderboard

### Socket.io Integration (Custom Server Required)

The app uses a **custom Next.js server** (`server.js`) instead of the standard Next.js dev server. This is necessary for Socket.io real-time communication.

- `server.js`: Combines Next.js request handler with Socket.io server
- Game state stored in-memory using a `Map` (ephemeral, resets on server restart)
- All pages use `'use client'` directive since they require client-side interactivity
- Socket instances are reused across page navigations to maintain connection state

**Key pattern**: When navigating between pages in the same flow (e.g., lobby → game → results), the socket connection is preserved by NOT calling `socket.disconnect()` in cleanup functions. Instead, components rejoin the room using `teacher-rejoin` or `student-rejoin` events.

### Critical Socket Events

**Room Management:**
- `create-game`: Teacher creates room, receives room code
- `join-game`: Student joins with room code
- `teacher-rejoin` / `student-rejoin`: Reconnect to room after page navigation

**Game Flow:**
- `start-game`: Teacher starts, server sends `game-started` broadcast
- `get-game-state`: Request current game state (used when refreshing/navigating)
- `submit-tap`: Student sends tap event (timestamp, noteValue, accuracy)
- `end-game`: Teacher ends, server calculates results and broadcasts `game-ended`

**State Updates:**
- `player-joined` / `player-left`: Broadcast when players join/leave
- `player-count-update`: Sent to individual students when they rejoin
- `segment-changed`: Broadcast when note value changes
- `teacher-disconnected`: Notify students if teacher leaves

### Timing & Accuracy System (RhythmEngine)

The `lib/rhythm-engine.ts` uses **Tone.js** (Web Audio API wrapper) for precise audio timing:

- **Tempo-based timing**: BPM from game config sets Transport tempo
- **Expected tap times**: Calculated based on note value's `tapsPerBeat` property (e.g., eighth note = 2 taps/beat)
- **Accuracy calculation**: Finds nearest expected tap time, returns difference in milliseconds
- **Metronome**: Scheduled using `Transport.scheduleRepeat` on quarter notes

**Accuracy thresholds:**
- Great (🎯): ±50ms
- Good (✓): ±100ms
- Miss (✗): >100ms

**IMPORTANT**: Tone.js requires user interaction before audio can play. All pages call `await rhythmEngine.init()` which calls `Tone.start()`.

### Page Flow Architecture

**Teacher:**
`/` → `/teacher/setup` → `/teacher/lobby` → `/teacher/game` → `/teacher/results`

**Student:**
`/` → `/student/join` → `/student/waiting` → `/student/game` → `/student/results`

Session storage used to persist:
- `roomCode`: Game room identifier
- `playerName`: Student's display name
- `teacherName`: Teacher's display name

### Game State Management

Game state lives in `server.js` in the `games` Map:

```javascript
{
  roomCode: string,
  config: GameConfig,
  players: Player[],
  status: 'lobby' | 'playing' | 'finished',
  segments: GameSegment[],
  currentSegment: GameSegment,
  startTime: number,
  teacher: Player
}
```

**Segment generation**: Server calculates game segments in `generateGameSegments()` based on:
- Total duration → total beats (duration / 60 * tempo)
- Segment duration (in bars) → beats per segment
- Cycles through selected note values, creating time windows (startTime/endTime)

### Key Type Definitions (types/game.ts)

- `NoteValue`: Union type of supported note values (quarter, half, eighth, etc.)
- `NOTE_VALUES`: Record mapping each note value to display info and `tapsPerBeat`
- `GameConfig`: Tempo, note values, durations, leaderboard style
- `TapEvent`: Student tap with timestamp, noteValue, expectedTime, accuracy
- `GameSegment`: Time window (startTime, endTime) for a specific note value

### Results Calculation (server.js)

When game ends:
1. Calculate each player's accuracy: average of all taps, weighted by distance from expected time
2. Find best/worst note type per player (lowest/highest average accuracy)
3. Sort by overall accuracy descending
4. Broadcast results array to all clients

## Important Patterns & Quirks

### Socket Connection Reuse
Do NOT disconnect sockets when navigating between pages in the same session. Use rejoin events instead to maintain connection state.

### Suspense Boundaries
All pages using `useSearchParams()` must wrap the content component in a Suspense boundary (Next.js 16 requirement).

### Timing Sync
Students calculate tap accuracy client-side using local RhythmEngine instance. The server receives pre-calculated accuracy values in `submit-tap` events. This keeps timing tight and reduces server load.

### Game State Recovery
If a user refreshes mid-game, they emit `get-game-state` on mount. Server responds with current game status, segments, and timing so they can rejoin in progress.

### Known Issues
- Accuracy calculation needs refinement (noted in codebase comments)
- Game state is in-memory only (no persistence layer yet)

## Development Notes

- Next.js 16 App Router with React 19
- Tailwind CSS 4 for styling
- TypeScript strict mode enabled
- No API routes used (all real-time via Socket.io)
- `lib/socket-server.ts` exists but is UNUSED (logic is in `server.js` instead)
