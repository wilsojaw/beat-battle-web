'use client';

import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useTeacherStore } from '@/store/teacherStore';
import type { GameConfig, NoteValue, AudioMetadata } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';
import { NoteImage } from '@/components/NoteImage';
import { TemplatePickerModal } from '@/components/TemplatePickerModal';
import type { GameTemplate } from '@/lib/game-templates';
import { ALL_AUDIO_OPTIONS, isMetronomeOption, calculateMeasures, getGameplayDuration, formatDuration, type Song } from '@/lib/songs';

/**
 * SetupView - Teacher game configuration (replaces /teacher/setup)
 *
 * Pure presentational component - no socket listeners, just emits create-game
 */
export function SetupView() {
  const { setView, createRoom, setGameConfig } = useTeacherStore();

  const [teacherName, setTeacherName] = useState('Teacher');
  const [selectedSong, setSelectedSong] = useState<Song>(ALL_AUDIO_OPTIONS[0]); // Default to metronome
  const [tempo, setTempo] = useState(100);
  const [selectedNotes, setSelectedNotes] = useState<NoteValue[]>(['quarter', 'eighth', 'half']);
  const [totalMeasures, setTotalMeasures] = useState(16);
  const [measuresPerSegment, setMeasuresPerSegment] = useState(2);
  const [showNextNote, setShowNextNote] = useState(true);
  const [leaderboardStyle, setLeaderboardStyle] = useState<'full' | 'top3' | 'stars-only'>('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Derived state
  const isMetronome = isMetronomeOption(selectedSong);
  const effectiveTempo = isMetronome ? tempo : selectedSong.tempo;
  const effectiveMeasures = isMetronome ? totalMeasures : calculateMeasures(selectedSong);
  const effectiveTimeSignature = selectedSong.timeSignature;
  const beatsPerMeasure = effectiveTimeSignature === '3/4' ? 3 : effectiveTimeSignature === '6/8' ? 6 : effectiveTimeSignature === '2/4' ? 2 : 4;
  const songDuration = isMetronome ? null : getGameplayDuration(selectedSong);
  
  // Locked settings (some songs have specific choreography)
  const hasLockedNotes = !isMetronome && !!selectedSong.lockedNoteValues;
  const hasLockedMeasuresPerSegment = !isMetronome && !!selectedSong.lockedMeasuresPerSegment;
  const effectiveNotes = hasLockedNotes ? selectedSong.lockedNoteValues! : selectedNotes;
  const effectiveMeasuresPerSegment = hasLockedMeasuresPerSegment ? selectedSong.lockedMeasuresPerSegment! : measuresPerSegment;

  // Handle song selection
  const handleSongChange = (songId: string) => {
    const song = ALL_AUDIO_OPTIONS.find(s => s.id === songId);
    if (song) {
      setSelectedSong(song);
      // Apply song's settings (locked or suggested)
      if (!isMetronomeOption(song)) {
        if (song.lockedNoteValues) {
          setSelectedNotes(song.lockedNoteValues);
        } else {
          setSelectedNotes(song.suggestedNoteValues);
        }
        if (song.lockedMeasuresPerSegment) {
          setMeasuresPerSegment(song.lockedMeasuresPerSegment);
        } else {
          setMeasuresPerSegment(song.suggestedMeasuresPerSegment);
        }
      }
    }
  };

  const noteOptions: NoteValue[] = ['quarter', 'half', 'whole', 'eighth', 'dotted-quarter', 'sixteenth'];

  const applyTemplate = (template: GameTemplate) => {
    setTempo(template.settings.tempo);
    setSelectedNotes(template.settings.noteValues);
    setTotalMeasures(template.settings.totalMeasures);
    setMeasuresPerSegment(template.settings.measuresPerSegment);
    setShowNextNote(template.settings.showNextNote);
    setLeaderboardStyle(template.settings.leaderboardStyle);
  };

  const toggleNote = (note: NoteValue) => {
    if (selectedNotes.includes(note)) {
      // Must have at least one note selected
      if (selectedNotes.length > 1) {
        setSelectedNotes(selectedNotes.filter(n => n !== note));
      }
    } else {
      setSelectedNotes([...selectedNotes, note]);
    }
  };

  const createGame = async () => {
    if (!teacherName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedNotes.length === 0) {
      setError('Please select at least one note value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build audio metadata if a song is selected
      const audioMetadata: AudioMetadata | undefined = !isMetronome ? {
        songId: selectedSong.id,
        audioUrl: selectedSong.audioUrl,
        midiUrl: selectedSong.midiUrl,
        tempo: selectedSong.tempo,
        timeSignature: selectedSong.timeSignature
      } : undefined;

      const config: GameConfig = {
        tempo: effectiveTempo,
        noteValues: effectiveNotes,
        segmentDuration: effectiveMeasuresPerSegment,
        totalDuration: 0, // Not used anymore
        totalMeasures: effectiveMeasures,
        measuresPerSegment: effectiveMeasuresPerSegment,
        showNextNote,
        scoringProfile: 'accuracy-only',
        leaderboardStyle,
        timeSignature: effectiveTimeSignature,
        songName: isMetronome ? undefined : selectedSong.name,
        audio: audioMetadata,
        segmentPattern: selectedSong.segmentPattern // Specific order of note values (if song has choreography)
      };

      socket.emit('create-game', { teacherName: teacherName.trim(), config }, (response: any) => {
        if (response.success) {
          // Store in Zustand store
          createRoom(response.roomCode, teacherName.trim());
          setGameConfig(config);

          // Transition to lobby view
          setView('lobby');
        } else {
          setError('Failed to create game. Please try again.');
          setLoading(false);
        }
      });
    } catch (err) {
      setError('Connection error. Please check your internet connection.');
      setLoading(false);
    }
  };

  const goToHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // Calculate total game duration based on measures, tempo, and time signature
  const calculateGameDuration = (measures: number, bpm: number, beats: number = 4) => {
    const secondsPerBeat = 60 / bpm;
    const secondsPerMeasure = secondsPerBeat * beats;
    const totalSeconds = secondsPerMeasure * measures;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return { totalSeconds, minutes, seconds };
  };

  const gameDuration = calculateGameDuration(effectiveMeasures, effectiveTempo, beatsPerMeasure);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-start sm:items-center justify-center py-6 px-4">
      <div className="w-full max-w-5xl">
        <div className="bg-white/95 rounded-2xl shadow-2xl p-6 lg:p-8 max-h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-purple-600">🎓 Teacher Setup</h1>
              <p className="text-gray-600 text-sm lg:text-base">Configure your Beat Battle game</p>
            </div>
            <button
              onClick={() => setShowTemplateModal(true)}
              disabled={loading}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
            >
              <span className="text-xl">📚</span>
              <span>Use Template</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
            <div className="space-y-5">
              {/* Teacher Name */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-base text-gray-900 placeholder:text-gray-400"
                  disabled={loading}
                />
              </div>

              {/* Song Selection */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-1">
                  Audio Track
                </label>
                <select
                  value={selectedSong.id}
                  onChange={(e) => handleSongChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-base text-gray-900 bg-white cursor-pointer"
                  disabled={loading}
                >
                  {ALL_AUDIO_OPTIONS.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.icon} {song.name} {!isMetronomeOption(song) ? `(${song.tempo} BPM)` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedSong.description}
                </p>
                {!isMetronome && songDuration && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <span>🎵</span>
                      <span>
                        <strong>{selectedSong.name}</strong> · {selectedSong.tempo} BPM · {effectiveTimeSignature} · {formatDuration(songDuration)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tempo */}
              <div className={!isMetronome ? 'opacity-50' : ''}>
                <label className="block text-base font-semibold text-gray-700 mb-1">
                  Tempo (BPM) - ♩ = {effectiveTempo}
                  {!isMetronome && <span className="text-xs font-normal text-gray-500 ml-2">(set by song)</span>}
                </label>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="5"
                  value={effectiveTempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                  disabled={loading || !isMetronome}
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>60 (Slow)</span>
                  <span>180 (Fast)</span>
                </div>
              </div>

              {/* Note Values */}
              <div className={hasLockedNotes ? 'opacity-60' : ''}>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Note Values to Use
                  {hasLockedNotes && <span className="text-xs font-normal text-gray-500 ml-2">(set by song)</span>}
                </label>
                {hasLockedNotes && selectedSong.segmentPattern && (
                  <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                    <strong>Pattern:</strong> {selectedSong.segmentPattern.map((seg, i) => 
                      `${NOTE_VALUES[seg.noteValue].displayName} (${seg.measures}${seg.measures === 1 ? ' measure' : ' measures'})`
                    ).join(' → ')}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {noteOptions.map((note) => (
                    <button
                      key={note}
                      onClick={() => !hasLockedNotes && toggleNote(note)}
                      disabled={loading || hasLockedNotes}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        effectiveNotes.includes(note)
                          ? 'bg-purple-500 border-purple-600 text-white'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400'
                      } ${hasLockedNotes ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="mb-1 flex justify-center">
                        <NoteImage noteValue={note} size={42} />
                      </div>
                      <div className="text-xs font-semibold text-center leading-tight">{NOTE_VALUES[note].displayName}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Total Measures */}
              <div className={!isMetronome ? 'opacity-50' : ''}>
                <label className="block text-base font-semibold text-gray-700 mb-1">
                  Total Measures - {effectiveMeasures}
                  {!isMetronome && <span className="text-xs font-normal text-gray-500 ml-2">(set by song)</span>}
                </label>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="4"
                  value={effectiveMeasures}
                  onChange={(e) => setTotalMeasures(parseInt(e.target.value))}
                  className="w-full h-3 bg-pink-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                  disabled={loading || !isMetronome}
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>4 measures</span>
                  <span>32 measures</span>
                </div>
                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Game Duration ({effectiveTimeSignature} time)</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {isMetronome ? (
                          <>{gameDuration.minutes}:{gameDuration.seconds.toString().padStart(2, '0')}</>
                        ) : (
                          formatDuration(songDuration || 0)
                        )}
                      </div>
                    </div>
                    <div className="text-3xl">⏱️</div>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {isMetronome ? (
                      <>{effectiveMeasures} measures × {effectiveTempo} BPM = {Math.round(gameDuration.totalSeconds)} seconds</>
                    ) : (
                      <>{selectedSong.name} · {effectiveMeasures} measures at {effectiveTempo} BPM</>
                    )}
                  </div>
                </div>
              </div>

              {/* Measures Per Segment */}
              <div className={hasLockedMeasuresPerSegment ? 'opacity-50' : ''}>
                <label className="block text-base font-semibold text-gray-700 mb-1">
                  Measures Per Note Value - {effectiveMeasuresPerSegment}
                  {hasLockedMeasuresPerSegment && <span className="text-xs font-normal text-gray-500 ml-2">(set by song)</span>}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={effectiveMeasuresPerSegment}
                  onChange={(e) => setMeasuresPerSegment(parseInt(e.target.value))}
                  className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                  disabled={loading || hasLockedMeasuresPerSegment}
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>1 measure</span>
                  <span>8 measures</span>
                </div>
              </div>

              {/* Show Next Note */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Show Next Note Preview
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNextNote(true)}
                    disabled={loading}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      showNextNote
                        ? 'bg-green-500 border-green-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">Show</div>
                    <div className="text-xs mt-1 opacity-80">Easier for students</div>
                  </button>
                  <button
                    onClick={() => setShowNextNote(false)}
                    disabled={loading}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      !showNextNote
                        ? 'bg-orange-500 border-orange-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-orange-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">Hide</div>
                    <div className="text-xs mt-1 opacity-80">More challenging</div>
                  </button>
                </div>
              </div>

              {/* Leaderboard Style */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Leaderboard Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setLeaderboardStyle('full')}
                    disabled={loading}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      leaderboardStyle === 'full'
                        ? 'bg-purple-500 border-purple-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">Full Leaderboard</div>
                    <div className="text-xs mt-1 opacity-80">Show all rankings</div>
                  </button>

                  <button
                    onClick={() => setLeaderboardStyle('top3')}
                    disabled={loading}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      leaderboardStyle === 'top3'
                        ? 'bg-purple-500 border-purple-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">Top 3 Only</div>
                    <div className="text-xs mt-1 opacity-80">Show podium</div>
                  </button>

                  <button
                    onClick={() => setLeaderboardStyle('stars-only')}
                    disabled={loading}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      leaderboardStyle === 'stars-only'
                        ? 'bg-purple-500 border-purple-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">Stars Only</div>
                    <div className="text-xs mt-1 opacity-80">No ranking shown</div>
                  </button>
                </div>

                {/* Action Buttons (desktop) */}
                <div className="hidden lg:flex gap-3 mt-6">
                  <button
                    onClick={goToHome}
                    disabled={loading}
                    className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={createGame}
                    disabled={loading || !teacherName.trim()}
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Game...' : 'Start Lobby'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons (mobile) */}
          <div className="mt-6 flex flex-col gap-3 lg:hidden">
            <button
              onClick={goToHome}
              disabled={loading}
              className="w-full px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={createGame}
              disabled={loading || !teacherName.trim()}
              className="w-full px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Game...' : 'Start Lobby'}
            </button>
          </div>
        </div>

        {/* Template Picker Modal */}
        <TemplatePickerModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={applyTemplate}
        />
      </div>
    </div>
  );
}
