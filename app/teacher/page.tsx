'use client';

import { useEffect } from 'react';
import { useTeacherStore } from '@/store/teacherStore';
import { socket } from '@/lib/socket';
import { SetupView } from '@/components/teacher/SetupView';
import { LobbyView } from '@/components/teacher/LobbyView';
import { PlayingView } from '@/components/teacher/PlayingView';
import { ResultsView } from '@/components/teacher/ResultsView';

/**
 * TeacherGameContainer - Single-page container for entire teacher flow
 *
 * Renders different views based on current state:
 * - 'setup'    → SetupView (game configuration)
 * - 'lobby'    → LobbyView (waiting for students)
 * - 'playing'  → PlayingView (game monitoring)
 * - 'finished' → ResultsView (results dashboard)
 *
 * NO socket listeners here - all handled by SocketManager
 * NO navigation - just view switching based on state
 */
export default function TeacherGameContainer() {
  const { view, roomCode, teacherName } = useTeacherStore();

  // On mount, check if we have existing session and rejoin if needed
  useEffect(() => {
    // Try to restore session from sessionStorage
    if (typeof window === 'undefined') return;

    const storedRoomCode = sessionStorage.getItem('roomCode');
    const storedTeacherName = sessionStorage.getItem('teacherName');
    const isTeacher = sessionStorage.getItem('isTeacher') === 'true';

    if (storedRoomCode && storedTeacherName && isTeacher) {
      console.log('[TeacherGameContainer] Restoring session:', storedRoomCode);

      // Restore to store
      useTeacherStore.getState().createRoom(storedRoomCode, storedTeacherName);

      // Rejoin room if socket is connected
      if (socket.connected) {
        console.log('[TeacherGameContainer] Socket already connected, rejoining room');
        socket.emit('teacher-rejoin', {
          roomCode: storedRoomCode,
          teacherName: storedTeacherName
        });

        // Request current game state
        socket.emit('get-game-state', { roomCode: storedRoomCode }, (response: any) => {
          console.log('[TeacherGameContainer] get-game-state response:', response);

          if (!response.success) return;

          const game = response.game;

          if (game.status === 'lobby') {
            useTeacherStore.getState().setView('lobby');
            useTeacherStore.getState().setPlayers(game.players);
          } else if (game.status === 'playing') {
            useTeacherStore.getState().setGameData({
              startTime: game.startTime,
              segments: game.segments,
              config: game.config,
            });
            useTeacherStore.getState().setCurrentSegment(game.currentSegment);
            useTeacherStore.getState().setView('playing');
            useTeacherStore.getState().setPlayers(game.players);
          } else if (game.status === 'finished') {
            useTeacherStore.getState().setView('finished');
            if (game.results) {
              useTeacherStore.getState().setResults(game.results);
            }
          }
        });
      }
    }
  }, []);

  // Render appropriate view based on state
  return (
    <>
      {view === 'setup' && <SetupView />}
      {view === 'lobby' && <LobbyView />}
      {view === 'playing' && <PlayingView />}
      {view === 'finished' && <ResultsView />}
    </>
  );
}
