'use client';

import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useSocketStore } from '@/store/socketStore';
import { useStudentStore } from '@/store/studentStore';
import { useTeacherStore } from '@/store/teacherStore';
import type { GameSegment, Player, MilestoneEvent, LeaderboardUpdate, PersonalStats, GameResult } from '@/types/game';

/**
 * SocketManager - Persistent socket event handler
 *
 * This component is mounted at the app root level and NEVER unmounts during gameplay.
 * It registers ALL socket event listeners using named functions that can be properly cleaned up.
 *
 * Following Socket.io official best practices:
 * - Listeners registered at app level, not in child components
 * - Named functions for proper cleanup with socket.off()
 * - Empty dependency array - listeners registered once
 * - Dispatches events to Zustand stores for state management
 */
export function SocketManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[SocketManager] Registering socket event listeners');

    // ==================== Connection State Handlers ====================

    function onConnect() {
      console.log('[Socket] Connected:', socket.id);
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setSocketId(socket.id);
      useSocketStore.getState().setReconnecting(false);
      useSocketStore.getState().setError(null);
    }

    function onDisconnect(reason: string) {
      console.log('[Socket] Disconnected:', reason);
      useSocketStore.getState().setConnected(false);

      if (reason === 'io server disconnect') {
        // Server forcibly disconnected - need manual reconnect
        console.log('[Socket] Server disconnected, attempting manual reconnect');
        socket.connect();
      }
    }

    function onConnectError(error: Error) {
      console.error('[Socket] Connection error:', error.message);
      useSocketStore.getState().setError(error.message);
    }

    function onReconnect(attemptNumber: number) {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setReconnecting(false);

      // After reconnection, rejoin room if we have room code
      const studentRoomCode = useStudentStore.getState().roomCode;
      const teacherRoomCode = useTeacherStore.getState().roomCode;

      if (studentRoomCode) {
        const playerName = useStudentStore.getState().playerName;
        console.log('[Socket] Rejoining student room after reconnect:', studentRoomCode);
        socket.emit('student-rejoin', { roomCode: studentRoomCode, playerName });
        socket.emit('get-game-state', { roomCode: studentRoomCode }, onGetGameStateStudent);
      } else if (teacherRoomCode) {
        const teacherName = useTeacherStore.getState().teacherName;
        console.log('[Socket] Rejoining teacher room after reconnect:', teacherRoomCode);
        socket.emit('teacher-rejoin', { roomCode: teacherRoomCode, teacherName });
        socket.emit('get-game-state', { roomCode: teacherRoomCode }, onGetGameStateTeacher);
      }
    }

    function onReconnectAttempt(attemptNumber: number) {
      console.log('[Socket] Reconnection attempt', attemptNumber);
      useSocketStore.getState().setReconnecting(true);
    }

    function onReconnectError(error: Error) {
      console.error('[Socket] Reconnection error:', error.message);
    }

    function onReconnectFailed() {
      console.error('[Socket] Reconnection failed after all attempts');
      useSocketStore.getState().setError('Unable to reconnect to server');
    }

    // ==================== Student Event Handlers ====================

    function onPlayerJoined(data: { totalPlayers: number; playerNames?: string[]; config?: any }) {
      console.log('[Student] Player joined:', data);
      useStudentStore.getState().setPlayerCount(data.totalPlayers);
      if (data.playerNames) {
        useStudentStore.getState().setPlayerNames(data.playerNames);
      }
      if (data.config) {
        useStudentStore.getState().setGameConfig(data.config);
      }
    }

    function onPlayerLeft(data: { totalPlayers: number; playerNames?: string[] }) {
      console.log('[Student] Player left:', data);
      useStudentStore.getState().setPlayerCount(data.totalPlayers);
      if (data.playerNames) {
        useStudentStore.getState().setPlayerNames(data.playerNames);
      }
    }

    function onPlayerCountUpdate(data: { totalPlayers: number }) {
      console.log('[Student] Player count update:', data);
      useStudentStore.getState().setPlayerCount(data.totalPlayers);
    }

    function onCountdownStart(data: { countdown: number }, callback?: Function) {
      console.log('[Student] Countdown start:', data.countdown);
      useStudentStore.getState().setView('countdown');
      useStudentStore.getState().setCountdown(data.countdown);

      // Acknowledge receipt (if callback provided for ACK-based events)
      if (callback) callback('received');
    }

    function onCountdownTick(data: { countdown: number }) {
      console.log('[Student] Countdown tick:', data.countdown);
      useStudentStore.getState().setCountdown(data.countdown);
    }

    function onGameStarted(data: {
      startTime: number;
      segments: GameSegment[];
      currentSegment: GameSegment;
      config: any;
    }, callback?: Function) {
      console.log('[Student] Game started:', data);

      useStudentStore.getState().setGameData({
        startTime: data.startTime,
        segments: data.segments,
        config: data.config,
      });
      useStudentStore.getState().setCurrentSegment(data.currentSegment);
      useStudentStore.getState().setCountdown(null);

      // Find next segment
      const currentIndex = data.segments.findIndex(s =>
        s.noteValue === data.currentSegment.noteValue &&
        s.startTime === data.currentSegment.startTime
      );
      if (currentIndex >= 0 && currentIndex < data.segments.length - 1) {
        useStudentStore.getState().setNextSegment(data.segments[currentIndex + 1]);
      }

      // Acknowledge receipt (if callback provided for ACK-based events)
      if (callback) callback('received');
    }

    function onSegmentChanged(data: { segment: GameSegment }) {
      console.log('[Student] Segment changed:', data.segment.noteValue);
      const segments = useStudentStore.getState().gameData?.segments || [];

      useStudentStore.getState().setCurrentSegment(data.segment);

      // Find next segment
      const currentIndex = segments.findIndex(s =>
        s.noteValue === data.segment.noteValue && s.startTime === data.segment.startTime
      );
      if (currentIndex >= 0 && currentIndex < segments.length - 1) {
        useStudentStore.getState().setNextSegment(segments[currentIndex + 1]);
      } else {
        useStudentStore.getState().setNextSegment(null);
      }
    }

    function onGameEnded(data: any, callback?: Function) {
      console.log('[Student] Game ended:', data);
      useStudentStore.getState().setResults(data);

      // Acknowledge receipt (if callback provided for ACK-based events)
      if (callback) callback('received');
    }

    function onMilestoneAchieved(milestone: MilestoneEvent) {
      console.log('[Student] Milestone achieved:', milestone);
      useStudentStore.getState().addMilestone(milestone);
    }

    function onLeaderboardUpdate(update: LeaderboardUpdate) {
      console.log('[Student] Leaderboard update:', update);
      useStudentStore.getState().setLeaderboard(update);
    }

    function onPersonalStatsUpdate(stats: PersonalStats) {
      console.log('[Student] Personal stats update:', stats);
      useStudentStore.getState().setPersonalStats(stats);
    }

    function onTeacherDisconnected() {
      console.log('[Student] Teacher disconnected');
      useStudentStore.getState().setView('joining');
      useStudentStore.getState().reset();

      // Show alert to user
      if (typeof window !== 'undefined') {
        alert('Teacher disconnected. Returning to join screen.');
      }
    }

    function onGetGameStateStudent(response: any) {
      console.log('[Student] Get game state response:', response);

      if (!response.success) return;

      const game = response.game;

      if (game.status === 'lobby') {
        useStudentStore.getState().setView('lobby');
        useStudentStore.getState().setPlayerNames(game.players.map((p: Player) => p.name));
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
    }

    // ==================== Teacher Event Handlers ====================

    function onPlayerJoinedTeacher(data: { player: Player; totalPlayers: number }) {
      console.log('[Teacher] Player joined:', data.player.name);
      useTeacherStore.getState().addPlayer(data.player);
    }

    function onPlayerLeftTeacher(data: { playerId: string; totalPlayers: number; playerNames?: string[] }) {
      console.log('[Teacher] Player left:', data.playerId);
      useTeacherStore.getState().removePlayer(data.playerId);
    }

    function onPlayerConnectionStatus(data: { playerId: string; connected: boolean }) {
      console.log('[Teacher] Player connection status:', data);
      useTeacherStore.getState().updatePlayer(data.playerId, { connected: data.connected });
    }

    function onCountdownStartTeacher(data: { countdown: number }) {
      console.log('[Teacher] Countdown start:', data.countdown);
      useTeacherStore.getState().setCountdown(data.countdown);
    }

    function onCountdownTickTeacher(data: { countdown: number }) {
      console.log('[Teacher] Countdown tick:', data.countdown);
      useTeacherStore.getState().setCountdown(data.countdown);
    }

    function onGameStartedTeacher(data: {
      startTime: number;
      segments: GameSegment[];
      currentSegment: GameSegment;
      config: any;
    }) {
      console.log('[Teacher] Game started:', data);
      useTeacherStore.getState().setGameData({
        startTime: data.startTime,
        segments: data.segments,
        config: data.config,
      });
      useTeacherStore.getState().setCurrentSegment(data.currentSegment);
      useTeacherStore.getState().setCountdown(null);
    }

    function onSegmentChangedTeacher(data: { segment: GameSegment }) {
      console.log('[Teacher] Segment changed:', data.segment.noteValue);
      useTeacherStore.getState().setCurrentSegment(data.segment);
    }

    function onGameEndedTeacher(data: { results: GameResult[] }) {
      console.log('[Teacher] Game ended:', data);
      useTeacherStore.getState().setResults(data.results);
    }

    function onPlayerTap(data: { playerId: string; tap: any }) {
      // Teacher receives tap events for monitoring
      console.log('[Teacher] Player tap:', data.playerId);
      // Could store in teacher store for live monitoring dashboard
    }

    function onGetGameStateTeacher(response: any) {
      console.log('[Teacher] Get game state response:', response);

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
    }

    // ==================== Register All Listeners ====================

    // Connection events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect', onReconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('reconnect_error', onReconnectError);
    socket.on('reconnect_failed', onReconnectFailed);

    // Student events
    socket.on('player-joined', onPlayerJoined);
    socket.on('player-left', onPlayerLeft);
    socket.on('player-count-update', onPlayerCountUpdate);
    socket.on('countdown-start', onCountdownStart);
    socket.on('countdown-tick', onCountdownTick);
    socket.on('game-started', onGameStarted);
    socket.on('segment-changed', onSegmentChanged);
    socket.on('game-ended', onGameEnded);
    socket.on('milestone-achieved', onMilestoneAchieved);
    socket.on('leaderboard-update', onLeaderboardUpdate);
    socket.on('personal-stats-update', onPersonalStatsUpdate);
    socket.on('teacher-disconnected', onTeacherDisconnected);

    // Teacher events (using different handlers to avoid conflicts)
    // Note: Some events are shared (like countdown-start) but we handle them separately by role
    socket.on('player-connection-status', onPlayerConnectionStatus);
    socket.on('player-tap', onPlayerTap);

    // Initialize connection if not already connected
    if (!socket.connected) {
      console.log('[SocketManager] Initiating socket connection');
      socket.connect();
    } else {
      console.log('[SocketManager] Socket already connected');
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setSocketId(socket.id);
    }

    // ==================== Cleanup Function ====================
    return () => {
      console.log('[SocketManager] Cleaning up socket event listeners');

      // Remove connection event listeners
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect', onReconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('reconnect_error', onReconnectError);
      socket.off('reconnect_failed', onReconnectFailed);

      // Remove student event listeners
      socket.off('player-joined', onPlayerJoined);
      socket.off('player-left', onPlayerLeft);
      socket.off('player-count-update', onPlayerCountUpdate);
      socket.off('countdown-start', onCountdownStart);
      socket.off('countdown-tick', onCountdownTick);
      socket.off('game-started', onGameStarted);
      socket.off('segment-changed', onSegmentChanged);
      socket.off('game-ended', onGameEnded);
      socket.off('milestone-achieved', onMilestoneAchieved);
      socket.off('leaderboard-update', onLeaderboardUpdate);
      socket.off('personal-stats-update', onPersonalStatsUpdate);
      socket.off('teacher-disconnected', onTeacherDisconnected);

      // Remove teacher event listeners
      socket.off('player-connection-status', onPlayerConnectionStatus);
      socket.off('player-tap', onPlayerTap);

      // DO NOT disconnect socket - it should persist across the app lifetime
      // socket.disconnect() would break ongoing games
    };
  }, []); // Empty dependency array - listeners registered once, never re-registered

  return <>{children}</>;
}
