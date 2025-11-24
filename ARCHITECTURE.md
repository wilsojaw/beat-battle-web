# Beat Battle - Production Architecture Refactor Plan

## 📋 Executive Summary

This document outlines the complete refactoring plan to make Beat Battle bulletproof for 1000s of concurrent students. Based on research into Kahoot's architecture and Socket.io best practices, we're implementing industry-standard patterns for real-time multiplayer games.

---

## 🚨 Current Issues

### Critical Problems Identified:

1. **Socket Listener Anti-Pattern**: Listeners registered in child components, violating Socket.io official guidelines
2. **Race Conditions**: Navigation timing creates temporal coupling between page mount, listener registration, and event emission
3. **Improper Cleanup**: Using `socket.off('event')` without handler reference removes ALL listeners, not just component's
4. **State Management**: No centralized state causes prop drilling and synchronization issues
5. **No Connection Recovery**: No handling for dropped connections or state recovery after reconnection

### Audit Results:

- **81 socket operations** across 8 page components
- **Every page** registers its own socket listeners in useEffect
- **No persistent socket manager** - listeners torn down on navigation
- **Fire-and-forget events** - no acknowledgements for critical events
- **In-memory state** on server only - clients can't recover after refresh

---

## 🎯 Target Architecture (Kahoot-Style)

### Core Principles:

1. ✅ **Single-Page Architecture**: No navigation during active gameplay
2. ✅ **Persistent Socket Manager**: Listeners registered once at app level
3. ✅ **Centralized State**: Global state management (Zustand)
4. ✅ **View-Based Rendering**: Different UI views based on game state
5. ✅ **Acknowledgement-Based Flow**: Critical events require confirmation
6. ✅ **Connection Recovery**: Automatic reconnection with state synchronization

---

## 🏗️ New Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      app/layout.tsx                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               SocketManager (Provider)                  │ │
│  │  - Registers ALL socket listeners once                 │ │
│  │  - Dispatches events to Zustand store                  │ │
│  │  - Never unmounts during gameplay                      │ │
│  │  - Handles reconnection logic                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            ConnectionStatus (Component)                 │ │
│  │  - Shows connection state to user                      │ │
│  │  - Displays reconnection attempts                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Page Routes                            │ │
│  │  /              → Landing page                         │ │
│  │  /student       → StudentGameContainer (single page)   │ │
│  │  /teacher       → TeacherGameContainer (single page)   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Student Flow (Single Page):

```
/student (StudentGameContainer)
│
├─ view: 'joining'     → Join form (replaces /student/join)
├─ view: 'lobby'       → Waiting room (replaces /student/waiting)
├─ view: 'countdown'   → 3-2-1 countdown overlay
├─ view: 'playing'     → Game interface (replaces /student/game)
└─ view: 'finished'    → Results screen (replaces /student/results)
```

### Teacher Flow (Single Page):

```
/teacher (TeacherGameContainer)
│
├─ view: 'setup'       → Game configuration (replaces /teacher/setup)
├─ view: 'lobby'       → Waiting for students (replaces /teacher/lobby)
├─ view: 'playing'     → Live game monitoring (replaces /teacher/game)
└─ view: 'finished'    → Results dashboard (replaces /teacher/results)
```

---

## 📦 New File Structure

```
beat-battle-web/
├── app/
│   ├── layout.tsx                      # Root layout with SocketManager
│   ├── page.tsx                        # Landing page (unchanged)
│   ├── student/
│   │   └── page.tsx                    # NEW: StudentGameContainer (single page)
│   ├── teacher/
│   │   └── page.tsx                    # NEW: TeacherGameContainer (single page)
│   └── error.tsx                       # NEW: Error boundary
│
├── components/
│   ├── SocketManager.tsx               # NEW: Persistent socket event handler
│   ├── ConnectionStatus.tsx            # NEW: Connection state indicator
│   ├── ErrorBoundary.tsx               # NEW: React error boundary
│   │
│   ├── student/                        # NEW: Student view components
│   │   ├── JoiningView.tsx             # Join form view
│   │   ├── LobbyView.tsx               # Waiting room view
│   │   ├── CountdownView.tsx           # Countdown overlay view
│   │   ├── PlayingView.tsx             # Game interface view
│   │   └── ResultsView.tsx             # Results view
│   │
│   └── teacher/                        # NEW: Teacher view components
│       ├── SetupView.tsx               # Game setup view
│       ├── LobbyView.tsx               # Lobby monitor view
│       ├── PlayingView.tsx             # Live game monitor view
│       └── ResultsView.tsx             # Results dashboard view
│
├── store/
│   ├── studentStore.ts                 # NEW: Student Zustand store
│   ├── teacherStore.ts                 # NEW: Teacher Zustand store
│   └── socketStore.ts                  # NEW: Socket connection store
│
├── lib/
│   ├── socket.ts                       # NEW: Socket instance singleton
│   ├── socket-events.ts                # NEW: Socket event type definitions
│   └── rhythm-engine.ts                # (existing, unchanged)
│
├── hooks/
│   ├── useStudentGame.ts               # NEW: Student game logic hook
│   ├── useTeacherGame.ts               # NEW: Teacher game logic hook
│   └── useSocket.ts                    # NEW: Socket connection hook
│
└── server.js                           # Updated with production config
```

---

## 🔧 Implementation Steps

### Phase 1: Foundation (Steps 1-5)

#### Step 1: Install Dependencies
```bash
npm install zustand
```

#### Step 2: Create Socket Singleton
**File: `lib/socket.ts`**
- Export single socket instance
- Handle connection/disconnection
- Store on window object for dev mode persistence

#### Step 3: Create Zustand Stores
**File: `store/studentStore.ts`**
- Student game state (view, roomCode, playerName, gameData, etc.)
- Actions for state updates

**File: `store/teacherStore.ts`**
- Teacher game state (view, roomCode, gameConfig, players, etc.)
- Actions for state updates

**File: `store/socketStore.ts`**
- Connection state (connected, reconnecting, error)
- Clock sync offset
- Connection quality metrics

#### Step 4: Create SocketManager Component
**File: `components/SocketManager.tsx`**
- Registers ALL socket listeners in single useEffect with empty deps `[]`
- Uses NAMED FUNCTIONS for all handlers
- Dispatches to Zustand stores
- Proper cleanup with `socket.off(event, namedFunction)`
- Handles connection state changes
- Implements automatic reconnection

#### Step 5: Add SocketManager to Root Layout
**File: `app/layout.tsx`**
- Wrap children with SocketManager
- Add ConnectionStatus component

### Phase 2: Student Refactor (Steps 6-10)

#### Step 6: Create Student View Components
Extract UI from existing pages into view components:
- `components/student/JoiningView.tsx` (from app/student/join/page.tsx)
- `components/student/LobbyView.tsx` (from app/student/waiting/page.tsx)
- `components/student/CountdownView.tsx` (new)
- `components/student/PlayingView.tsx` (from app/student/game/page.tsx)
- `components/student/ResultsView.tsx` (from app/student/results/page.tsx)

**Key Changes:**
- Remove ALL socket.on/off/emit calls
- Read state from Zustand store
- Call store actions to update state
- Pure presentational components

#### Step 7: Create StudentGameContainer
**File: `app/student/page.tsx`**
```tsx
export default function StudentGameContainer() {
  const view = useStudentStore(state => state.view);

  return (
    <>
      {view === 'joining' && <JoiningView />}
      {view === 'lobby' && <LobbyView />}
      {view === 'countdown' && <CountdownView />}
      {view === 'playing' && <PlayingView />}
      {view === 'finished' && <ResultsView />}
    </>
  );
}
```

#### Step 8: Create useStudentGame Hook
**File: `hooks/useStudentGame.ts`**
- Business logic for student gameplay
- Rhythm engine management
- Tap handling
- State transitions

#### Step 9: Wire Up Student Socket Events in SocketManager
Add student event handlers to SocketManager:
- `player-joined` → update studentStore
- `countdown-start` → set view to 'countdown'
- `game-started` → set view to 'playing'
- `segment-changed` → update current segment
- `game-ended` → set view to 'finished'
- etc.

#### Step 10: Remove Old Student Pages
Delete:
- `app/student/join/page.tsx`
- `app/student/waiting/page.tsx`
- `app/student/game/page.tsx`
- `app/student/results/page.tsx`

### Phase 3: Teacher Refactor (Steps 11-14)

#### Step 11: Create Teacher View Components
Extract UI from existing pages:
- `components/teacher/SetupView.tsx`
- `components/teacher/LobbyView.tsx`
- `components/teacher/PlayingView.tsx`
- `components/teacher/ResultsView.tsx`

#### Step 12: Create TeacherGameContainer
**File: `app/teacher/page.tsx`**
View-based rendering like StudentGameContainer

#### Step 13: Wire Up Teacher Socket Events in SocketManager
Add teacher event handlers

#### Step 14: Remove Old Teacher Pages
Delete old page files

### Phase 4: Server Hardening (Steps 15-17)

#### Step 15: Add Production Socket.io Config
**File: `server.js`**
```javascript
const io = new Server(httpServer, {
  cors: { /* ... */ },

  // Connection state recovery (NEW in Socket.io v4)
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },

  // Performance tuning
  perMessageDeflate: false,          // Critical: prevents memory exhaustion
  pingTimeout: 60000,                // 60s (up from 20s default)
  pingInterval: 25000,               // 25s heartbeat
  maxHttpBufferSize: 1e6,            // 1MB

  // Connection limits
  connectTimeout: 45000,             // 45s connection timeout
});
```

#### Step 16: Implement Acknowledgement-Based Events
Update critical events to require acknowledgement:

**Server:**
```javascript
socket.emit('game-started', data, (ack) => {
  if (!ack) {
    console.log('Client did not acknowledge game-started, retrying...');
    // Retry logic
  }
});
```

**Client (SocketManager):**
```javascript
socket.on('game-started', (data, callback) => {
  studentStore.setState({ view: 'playing', gameData: data });
  callback('received'); // Acknowledge receipt
});
```

#### Step 17: Add Connection Recovery Logic
**In SocketManager:**
- Listen for `disconnect` event
- Attempt reconnection (automatic with Socket.io)
- On `connect` after disconnect, emit rejoin with room code
- Server sends current game state
- Client updates store to match server state

### Phase 5: Error Handling & UI (Steps 18-19)

#### Step 18: Create Error Boundary
**File: `components/ErrorBoundary.tsx`**
React error boundary to catch rendering errors

**File: `app/error.tsx`**
Next.js error page

#### Step 19: Create ConnectionStatus Component
**File: `components/ConnectionStatus.tsx`**
- Shows online/offline/reconnecting status
- Displays latency
- Shows reconnection attempts

### Phase 6: Testing & Documentation (Steps 20-22)

#### Step 20: Cross-Browser Testing
Test on:
- Chrome Desktop (macOS, Windows)
- Chrome Mobile (iOS, Android)
- Safari Desktop (macOS)
- Safari Mobile (iOS)

**Test scenarios:**
- Full game flow (join → lobby → countdown → play → results)
- Mid-game refresh (should recover state)
- Connection drop (should reconnect automatically)
- Background tab (iOS Safari will disconnect - expected)

#### Step 21: Load Testing
Use Artillery or k6 to simulate:
- 100 concurrent students
- 1000 concurrent students
- Monitor server CPU, memory, connection count

#### Step 22: Documentation
**File: `DEPLOYMENT.md`**
- Supported browsers
- Student instructions (keep browser in foreground)
- Teacher setup guide
- Troubleshooting guide

---

## 🔑 Key Implementation Details

### Named Function Pattern (Critical!)

**WRONG (Current Code):**
```typescript
// ❌ Anonymous function - can't remove specific listener
socket.on('game-started', (data) => {
  handleGameStart(data);
});

// ❌ Removes ALL game-started listeners, not just this one
socket.off('game-started');
```

**CORRECT (New Pattern):**
```typescript
// ✅ Named function - can be removed specifically
function onGameStarted(data) {
  studentStore.setState({ view: 'playing', gameData: data });
}

socket.on('game-started', onGameStarted);

// Cleanup - only removes this specific listener
return () => {
  socket.off('game-started', onGameStarted);
};
```

### Zustand Store Example

```typescript
// store/studentStore.ts
import { create } from 'zustand';

interface StudentState {
  view: 'joining' | 'lobby' | 'countdown' | 'playing' | 'finished';
  roomCode: string | null;
  playerName: string;
  gameData: any | null;
  currentSegment: any | null;
  countdown: number | null;
  // ... etc

  // Actions
  setView: (view: StudentState['view']) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  setGameData: (data: any) => void;
  // ... etc
}

export const useStudentStore = create<StudentState>((set) => ({
  view: 'joining',
  roomCode: null,
  playerName: '',
  gameData: null,
  currentSegment: null,
  countdown: null,

  setView: (view) => set({ view }),
  joinRoom: (roomCode, playerName) => set({ roomCode, playerName }),
  setGameData: (data) => set({ gameData: data }),
  // ... etc
}));
```

### SocketManager Structure

```typescript
// components/SocketManager.tsx
'use client';
import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useStudentStore } from '@/store/studentStore';
import { useTeacherStore } from '@/store/teacherStore';
import { useSocketStore } from '@/store/socketStore';

export function SocketManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Connection state handlers
    function onConnect() {
      console.log('Socket connected:', socket.id);
      useSocketStore.getState().setConnected(true);
    }

    function onDisconnect(reason: string) {
      console.log('Socket disconnected:', reason);
      useSocketStore.getState().setConnected(false);
    }

    function onConnectError(error: Error) {
      console.error('Socket connection error:', error);
      useSocketStore.getState().setError(error.message);
    }

    // Student event handlers
    function onPlayerJoined(data: any) {
      useStudentStore.getState().updatePlayerCount(data.totalPlayers);
    }

    function onCountdownStart(data: { countdown: number }) {
      useStudentStore.getState().setView('countdown');
      useStudentStore.getState().setCountdown(data.countdown);
    }

    function onGameStarted(data: any, callback?: Function) {
      useStudentStore.getState().setView('playing');
      useStudentStore.getState().setGameData(data);
      if (callback) callback('received'); // Acknowledge
    }

    function onSegmentChanged(data: any) {
      useStudentStore.getState().setCurrentSegment(data.segment);
    }

    function onGameEnded(data: any) {
      useStudentStore.getState().setView('finished');
      useStudentStore.getState().setResults(data);
    }

    // Teacher event handlers
    function onPlayerJoinedTeacher(data: any) {
      useTeacherStore.getState().addPlayer(data);
    }

    // ... more handlers

    // Register all listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('player-joined', onPlayerJoined);
    socket.on('countdown-start', onCountdownStart);
    socket.on('game-started', onGameStarted);
    socket.on('segment-changed', onSegmentChanged);
    socket.on('game-ended', onGameEnded);
    // ... register all other events

    // Cleanup: Remove specific listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('player-joined', onPlayerJoined);
      socket.off('countdown-start', onCountdownStart);
      socket.off('game-started', onGameStarted);
      socket.off('segment-changed', onSegmentChanged);
      socket.off('game-ended', onGameEnded);
      // ... remove all other listeners
    };
  }, []); // Empty deps - listeners registered once, never removed during app lifetime

  return <>{children}</>;
}
```

---

## 📊 Expected Outcomes

After this refactor:

✅ **Zero Race Conditions**: Socket listeners always ready before events fire
✅ **Cross-Browser Reliability**: Safari and Chrome both work consistently
✅ **Scalable to 1000s**: Proper server config handles large concurrent connections
✅ **Connection Recovery**: Dropped connections automatically recover state
✅ **Industry Standard**: Following Socket.io official best practices
✅ **Maintainable**: Centralized state and clear separation of concerns

---

## 🚀 Migration Strategy

### Option 1: Big Bang (Faster, Higher Risk)
- Implement all steps in sequence
- Test everything at the end
- Deploy all at once

**Pros:** Fastest to complete
**Cons:** Harder to debug if issues arise

### Option 2: Incremental (Slower, Lower Risk)
- Implement Phase 1 (Foundation)
- Deploy and test
- Implement Phase 2 (Student)
- Deploy and test
- Continue phase by phase

**Pros:** Easier to debug, lower risk
**Cons:** Takes longer, more deploys

### Recommendation: **Incremental**
For a production app serving 1000s of students, incremental is safer.

---

## ⏱️ Estimated Timeline

| Phase | Steps | Estimated Time |
|-------|-------|----------------|
| Phase 1: Foundation | 1-5 | 2-3 hours |
| Phase 2: Student Refactor | 6-10 | 3-4 hours |
| Phase 3: Teacher Refactor | 11-14 | 3-4 hours |
| Phase 4: Server Hardening | 15-17 | 2-3 hours |
| Phase 5: Error Handling | 18-19 | 1-2 hours |
| Phase 6: Testing & Docs | 20-22 | 2-3 hours |
| **Total** | | **13-19 hours** |

---

## 📝 Notes

- All existing UI/UX stays the same - only architecture changes
- No changes to game logic or rhythm engine
- Server event handling stays mostly the same (just add ACKs and config)
- Current server.js in-memory state is fine for scale (no database needed yet)

---

## 🎯 Success Criteria

The refactor is complete when:

1. ✅ All socket listeners registered in SocketManager (not page components)
2. ✅ Student and teacher flows work as single-page apps
3. ✅ No navigation during active gameplay
4. ✅ Cross-browser testing passes (Chrome + Safari, desktop + mobile)
5. ✅ Load testing succeeds with 100+ concurrent students
6. ✅ Connection drop → reconnect → state recovery works
7. ✅ No race conditions or missed events
8. ✅ Documentation complete (DEPLOYMENT.md)

---

**Let's build a bulletproof rhythm game! 🎵🚀**
