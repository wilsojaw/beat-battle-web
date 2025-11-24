'use client';

import { useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket';
import { useTeacherStore } from '@/store/teacherStore';
import { RhythmEngine } from '@/lib/rhythm-engine';
import { NOTE_VALUES } from '@/types/game';

/**
 * PlayingView - Teacher monitoring during game (replaces /teacher/game)
 *
 * Shows current segment, metronome, and basic game status
 */
export function PlayingView() {
  const { roomCode, gameData, currentSegment, countdown, players } = useTeacherStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMeasure, setCurrentMeasure] = useState(0);

  const rhythmEngineRef = useRef<RhythmEngine | null>(null);
  const measureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize rhythm engine and metronome
  useEffect(() => {
    if (!gameData) return;

    const initGame = async () => {
      // Initialize rhythm engine with metronome
      rhythmEngineRef.current = new RhythmEngine(gameData.config.tempo);
      await rhythmEngineRef.current.init();

      // Start metronome for teacher
      rhythmEngineRef.current.startMetronome();
      rhythmEngineRef.current.start();
      setIsPlaying(true);

      // Update current measure
      const tempo = gameData.config.tempo;
      const beatDuration = (60 / tempo) * 1000;
      const measureDuration = beatDuration * 4; // 4 beats per measure
      const countInDuration = measureDuration; // 1 measure count-in

      measureIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - gameData.startTime;
        const currentMeasureNum = Math.floor((elapsed - countInDuration) / measureDuration) + 1;
        setCurrentMeasure(currentMeasureNum);
      }, 100);
    };

    initGame();

    return () => {
      if (measureIntervalRef.current) {
        clearInterval(measureIntervalRef.current);
      }
      if (rhythmEngineRef.current) {
        rhythmEngineRef.current.stop();
        rhythmEngineRef.current.dispose();
      }
    };
  }, [gameData]);

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
          <div className="text-[200px] font-bold leading-none">
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
  const totalMeasures = gameData?.segments[gameData.segments.length - 1]?.endMeasure || 16;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-purple-600 mb-2">🎓 Game in Progress</h1>
              <p className="text-gray-600">Room: {roomCode}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={toggleMute}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
              >
                {isMuted ? '🔇 Unmute' : '🔊 Mute'} Metronome
              </button>
              <button
                onClick={endGame}
                className="px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition-all shadow-lg"
              >
                End Game
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2">
                {currentMeasure === 0 ? 'Count In' : `${currentMeasure} / ${totalMeasures}`}
              </div>
              <div className="text-xl text-gray-700">Measures</div>
            </div>
          </div>

          {/* Current Note */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-8 mb-8">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Current Note Value:</div>
              <div className="text-[120px] leading-none mb-4">{noteInfo.symbol}</div>
              <div className="text-3xl font-bold text-gray-700 mb-2">{noteInfo.displayName}</div>
              <div className="text-lg text-gray-600">{noteInfo.description}</div>
            </div>
          </div>

          {/* Players */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">
              Players: {players.length}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {players.map((player) => (
                <div key={player.id} className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">🎵</div>
                  <div className="font-semibold text-gray-900 truncate">
                    {player.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {player.taps?.length || 0} taps
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
