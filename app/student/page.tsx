'use client';

import { useEffect } from 'react';
import { useStudentStore } from '@/store/studentStore';
import { socket } from '@/lib/socket';
import { JoiningView } from '@/components/student/JoiningView';
import { LobbyView } from '@/components/student/LobbyView';
import { CountdownView } from '@/components/student/CountdownView';
import { PlayingView } from '@/components/student/PlayingView';
import { ResultsView } from '@/components/student/ResultsView';

/**
 * StudentGameContainer - Single-page container for entire student flow
 *
 * Renders different views based on current state:
 * - 'joining'   → JoiningView (join form)
 * - 'lobby'     → LobbyView (waiting room)
 * - 'countdown' → CountdownView (3-2-1-GO!)
 * - 'playing'   → PlayingView (game interface)
 * - 'finished'  → ResultsView (results screen)
 *
 * NO socket listeners here - all handled by SocketManager
 * NO navigation - just view switching based on state
 */
export default function StudentGameContainer() {
  const { view, roomCode, playerName } = useStudentStore();

  // On mount, check if we have existing session and rejoin if needed
  useEffect(() => {
    // Try to restore session from sessionStorage
    if (typeof window === 'undefined') return;

    const storedRoomCode = sessionStorage.getItem('roomCode');
    const storedPlayerName = sessionStorage.getItem('playerName');

    if (storedRoomCode && storedPlayerName) {
      console.log('[StudentGameContainer] Restoring session:', storedRoomCode);

      // Restore to store
      useStudentStore.getState().joinRoom(storedRoomCode, storedPlayerName);

      // Rejoin room if socket is connected
      if (socket.connected) {
        console.log('[StudentGameContainer] Socket already connected, rejoining room');
        socket.emit('student-rejoin', {
          roomCode: storedRoomCode,
          playerName: storedPlayerName
        });

        // Request current game state
        socket.emit('get-game-state', { roomCode: storedRoomCode }, (response: any) => {
          console.log('[StudentGameContainer] get-game-state response:', response);

          if (!response.success) return;

          const game = response.game;

          if (game.status === 'lobby') {
            useStudentStore.getState().setView('lobby');
            useStudentStore.getState().setPlayerNames(game.players.map((p: any) => p.name));
            useStudentStore.getState().setPlayerCount(game.players.length);
            if (game.config) {
              useStudentStore.getState().setGameConfig(game.config);
            }
          } else if (game.status === 'playing') {
            useStudentStore.getState().setGameData({
              startTime: game.startTime,
              segments: game.segments,
              config: game.config,
            });
            useStudentStore.getState().setCurrentSegment(game.currentSegment);
            useStudentStore.getState().setView('playing');
          } else if (game.status === 'finished') {
            useStudentStore.getState().setView('finished');
          }
        });
      }
    }
  }, []);

  // Render appropriate view based on state
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
