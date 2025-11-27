'use client';

import { useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket';
import { useTeacherStore } from '@/store/teacherStore';
import { RhythmEngine } from '@/lib/rhythm-engine';
import { NOTE_VALUES } from '@/types/game';
import { NoteImage } from '@/components/NoteImage';

/**
 * PlayingView - Teacher monitoring during game (replaces /teacher/game)
 *
 * Shows current segment, metrics, leaderboard, and game controls
 */
export function PlayingView() {
  const { roomCode, gameData, currentSegment, countdown, players, leaderboard, previewMode } = useTeacherStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);

  const rhythmEngineRef = useRef<RhythmEngine | null>(null);
  const measureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize rhythm engine and metronome
  useEffect(() => {
    if (!gameData || previewMode) return;

    const initGame = async () => {
      // Initialize rhythm engine with metronome
      rhythmEngineRef.current = new RhythmEngine(gameData.config.tempo);
      await rhythmEngineRef.current.init();

      // Start metronome for teacher
      rhythmEngineRef.current.startMetronome();
      rhythmEngineRef.current.start();
      setIsPlaying(true);

      // Calculate timing based on measures and tempo
      const tempo = gameData.config.tempo;
      const beatsPerMeasure = 4; // TODO: Support other time signatures
      const beatDuration = (60 / tempo) * 1000; // ms per beat
      const measureDuration = beatDuration * beatsPerMeasure; // ms per measure
      const countInDuration = measureDuration; // 1 measure count-in
      const totalMeasures = gameData.config.totalMeasures || 16;
      const totalGameDuration = measureDuration * totalMeasures; // Duration based on measures

      measureIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - gameData.startTime;
        const currentMeasureNum = Math.floor((elapsed - countInDuration) / measureDuration) + 1;
        setCurrentMeasure(currentMeasureNum);
      }, 100);

      // Schedule segment changes (event-driven approach)
      console.log('[Teacher] Scheduling', gameData.segments.length, 'segment timers');

      // Calculate drift tolerance as 10% of shortest segment duration (tempo-aware)
      const shortestSegmentDuration = Math.min(...gameData.segments.map(s => s.endTime - s.startTime));
      const driftTolerance = shortestSegmentDuration * 0.1;
      console.log('[Teacher] Drift tolerance:', driftTolerance, 'ms');

      const segmentTimers: NodeJS.Timeout[] = [];
      const currentElapsed = Date.now() - gameData.startTime;

      gameData.segments.forEach((segment, index) => {
        const delay = Math.max(0, segment.startTime - currentElapsed);

        console.log(`[Teacher] Scheduling segment ${index + 1} (${segment.noteValue}) in ${delay}ms`);

        const timer = setTimeout(() => {
          console.log(`[Teacher] Segment ${index + 1} timer fired, emitting change-segment`);

          // Emit to server so it broadcasts to all clients
          socket.emit('change-segment', {
            roomCode,
            segmentIndex: index
          });
        }, delay);

        segmentTimers.push(timer);
      });

      // Store segment timers for cleanup
      (measureIntervalRef as any).segmentTimers = segmentTimers;

      // Auto-end timer - based on MEASURES not arbitrary time
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - gameData.startTime;
        const remaining = Math.max(0, (totalGameDuration + countInDuration) - elapsed);
        setTimeRemaining(remaining);

        // End when we've completed all measures
        if (remaining === 0 || currentMeasure > totalMeasures) {
          clearInterval(timerIntervalRef.current!);
          endGame();
        }
      }, 100);
    };

    initGame();

    return () => {
      if (measureIntervalRef.current) {
        clearInterval(measureIntervalRef.current);
      }
      if ((measureIntervalRef as any).segmentTimers) {
        (measureIntervalRef as any).segmentTimers.forEach((timer: NodeJS.Timeout) => clearTimeout(timer));
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (rhythmEngineRef.current) {
        rhythmEngineRef.current.stop();
        rhythmEngineRef.current.dispose();
      }
    };
  }, [gameData, previewMode]);

  useEffect(() => {
    if (previewMode && gameData) {
      setIsPlaying(true);
      setCurrentMeasure(4);
      setTimeRemaining(120000);
    }
  }, [previewMode, gameData]);

  // Calculate total taps from all players
  useEffect(() => {
    const total = players.reduce((sum, player) => sum + (player.taps?.length || 0), 0);
    setTotalTaps(total);
  }, [players]);

  const toggleMute = () => {
    if (rhythmEngineRef.current) {
      rhythmEngineRef.current.toggleMute();
      setIsMuted(!isMuted);
    }
  };

  const endGame = () => {
    socket.emit('end-game', { roomCode });
  };

  if (countdown !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-[300px] font-bold leading-none">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      </div>
    );
  }

  if (!isPlaying || !currentSegment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">Game Starting...</h1>
        </div>
      </div>
    );
  }

  const noteInfo = NOTE_VALUES[currentSegment.noteValue];
  const totalMeasures = gameData?.config.totalMeasures || 16;
  const segments = gameData?.segments || [];
  const currentSegmentIndex = segments.findIndex(s =>
    s.noteValue === currentSegment.noteValue && s.startTime === currentSegment.startTime
  );
  const nextSegment = currentSegmentIndex >= 0 && currentSegmentIndex < segments.length - 1
    ? segments[currentSegmentIndex + 1]
    : null;

  // Format time remaining
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4 flex items-center justify-center">
      <div className="max-w-7xl w-full">
        {/* Top Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-purple-600">🎓 Game in Progress</h1>
              <p className="text-gray-600">Room: {roomCode}</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-700">{timeString}</div>
                <div className="text-sm text-gray-600">Time Remaining</div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-700">
                  {currentMeasure === 0 ? 'Count In' : `${currentMeasure} / ${totalMeasures}`}
                </div>
                <div className="text-sm text-gray-600">Measures</div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-700">
                  Segment {currentSegmentIndex + 1} / {segments.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Note Display */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Current Note Value</h2>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <NoteImage noteValue={currentSegment.noteValue} size={150} />
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {noteInfo.displayName}
              </div>
              <div className="text-lg text-gray-600">
                {noteInfo.description}
              </div>
            </div>

            {nextSegment && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Next up:</div>
                <div className="flex items-center gap-3 justify-center">
                  <NoteImage noteValue={nextSegment.noteValue} size={48} />
                  <span className="text-lg font-semibold text-gray-700">
                    {NOTE_VALUES[nextSegment.noteValue].displayName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Class Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Class Metrics</h2>

            <div className="space-y-6">
              {/* Total Taps */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Taps</div>
                    <div className="text-4xl font-bold text-gray-700">{totalTaps}</div>
                  </div>
                  <div className="text-5xl">👆</div>
                </div>
              </div>

              {/* Active Players */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Active Players</div>
                    <div className="text-4xl font-bold text-gray-700">
                      {players.filter(p => (p.taps?.length || 0) > 0).length}
                    </div>
                  </div>
                  <div className="text-5xl">🎵</div>
                </div>
              </div>

              {/* Participation Rate */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Avg Taps/Player</div>
                    <div className="text-4xl font-bold text-gray-700">
                      {players.length > 0 ? Math.round(totalTaps / players.length) : 0}
                    </div>
                  </div>
                  <div className="text-5xl">📊</div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Leaderboard */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">🏆 Live Leaderboard</h2>

            {leaderboard && leaderboard.topPlayers.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.topPlayers.map((player, index) => (
                  <div
                    key={player.rank}
                    className={`rounded-lg p-4 ${index === 0
                      ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400'
                      : index === 1
                        ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-300'
                        : 'bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <div className="text-lg font-bold text-gray-800">
                            {player.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Rank #{player.rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-800">
                          {player.accuracy}%
                        </div>
                        {player.hasStreak && (
                          <div className="text-xl">🔥</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center text-sm text-gray-500 mt-4 pt-4 border-t">
                  Total Players: {leaderboard.totalPlayers}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">📊</div>
                <p>Waiting for student data...</p>
                <p className="text-sm mt-2">Rankings will appear as students start tapping</p>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-4">
            <button
              onClick={toggleMute}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-colors ${isMuted
                ? 'bg-gray-400 text-white hover:bg-gray-500'
                : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
            >
              {isMuted ? '🔇 Unmute Metronome' : '🔊 Mute Metronome'}
            </button>

            <button
              onClick={endGame}
              className="flex-1 px-6 py-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              🏁 End Game Early
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
