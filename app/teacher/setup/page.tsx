'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type { GameConfig, NoteValue } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';
import { TemplatePickerModal } from '@/components/TemplatePickerModal';
import type { GameTemplate } from '@/lib/game-templates';

let socket: Socket;

export default function TeacherSetup() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [tempo, setTempo] = useState(100);
  const [selectedNotes, setSelectedNotes] = useState<NoteValue[]>(['quarter', 'eighth', 'half']);
  const [totalMeasures, setTotalMeasures] = useState(16);
  const [measuresPerSegment, setMeasuresPerSegment] = useState(2);
  const [showNextNote, setShowNextNote] = useState(true);
  const [leaderboardStyle, setLeaderboardStyle] = useState<'full' | 'top3' | 'stars-only'>('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const noteOptions: NoteValue[] = ['quarter', 'half', 'whole', 'eighth', 'dotted-quarter', 'dotted-eighth', 'sixteenth'];

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
      // Connect to Socket.io server
      socket = io();

      const config: GameConfig = {
        tempo,
        noteValues: selectedNotes,
        segmentDuration: measuresPerSegment,
        totalDuration: 0, // Not used anymore
        totalMeasures,
        measuresPerSegment,
        showNextNote,
        scoringProfile: 'accuracy-only',
        leaderboardStyle
      };

      socket.emit('create-game', { teacherName: teacherName.trim(), config }, (response: any) => {
        if (response.success) {
          // Store game state in sessionStorage
          sessionStorage.setItem('roomCode', response.roomCode);
          sessionStorage.setItem('teacherName', teacherName.trim());
          sessionStorage.setItem('isTeacher', 'true');

          // Navigate to lobby
          router.push(`/teacher/lobby?code=${response.roomCode}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-purple-600 mb-2">🎓 Teacher Setup</h1>
              <p className="text-gray-600">Configure your Beat Battle game</p>
            </div>
            <button
              onClick={() => setShowTemplateModal(true)}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
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

          <div className="space-y-6">
            {/* Teacher Name */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg text-gray-900 placeholder:text-gray-400"
                disabled={loading}
              />
            </div>

            {/* Tempo */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Tempo (BPM) - ♩ = {tempo}
              </label>
              <input
                type="range"
                min="60"
                max="180"
                step="5"
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value))}
                className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>60 (Slow)</span>
                <span>180 (Fast)</span>
              </div>
            </div>

            {/* Note Values */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Note Values to Use
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {noteOptions.map((note) => (
                  <button
                    key={note}
                    onClick={() => toggleNote(note)}
                    disabled={loading}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedNotes.includes(note)
                        ? 'bg-purple-500 border-purple-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                    }`}
                  >
                    <div className="text-3xl mb-1">{NOTE_VALUES[note].symbol}</div>
                    <div className="text-sm font-medium">{NOTE_VALUES[note].displayName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total Measures */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Total Measures - {totalMeasures}
              </label>
              <input
                type="range"
                min="4"
                max="32"
                step="4"
                value={totalMeasures}
                onChange={(e) => setTotalMeasures(parseInt(e.target.value))}
                className="w-full h-3 bg-pink-200 rounded-lg appearance-none cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>4 measures</span>
                <span>32 measures</span>
              </div>
            </div>

            {/* Measures Per Segment */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Measures Per Note Value - {measuresPerSegment}
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={measuresPerSegment}
                onChange={(e) => setMeasuresPerSegment(parseInt(e.target.value))}
                className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>1 measure</span>
                <span>8 measures</span>
              </div>
            </div>

            {/* Show Next Note */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Show Next Note Preview
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowNextNote(true)}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    showNextNote
                      ? 'bg-green-500 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
                >
                  <div className="font-semibold">Show</div>
                  <div className="text-sm mt-1 opacity-80">Easier for students</div>
                </button>
                <button
                  onClick={() => setShowNextNote(false)}
                  disabled={loading}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    !showNextNote
                      ? 'bg-orange-500 border-orange-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                  }`}
                >
                  <div className="font-semibold">Hide</div>
                  <div className="text-sm mt-1 opacity-80">More challenging</div>
                </button>
              </div>
            </div>

            {/* Leaderboard Style */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Leaderboard Style
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setLeaderboardStyle('full')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    leaderboardStyle === 'full'
                      ? 'bg-purple-500 border-purple-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="font-semibold">Full Leaderboard</div>
                  <div className="text-sm mt-1 opacity-80">Show all rankings</div>
                </button>

                <button
                  onClick={() => setLeaderboardStyle('top3')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    leaderboardStyle === 'top3'
                      ? 'bg-purple-500 border-purple-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="font-semibold">Top 3 Only</div>
                  <div className="text-sm mt-1 opacity-80">Show podium</div>
                </button>

                <button
                  onClick={() => setLeaderboardStyle('stars-only')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    leaderboardStyle === 'stars-only'
                      ? 'bg-purple-500 border-purple-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="font-semibold">Stars Only</div>
                  <div className="text-sm mt-1 opacity-80">No ranking shown</div>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push('/')}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={createGame}
              disabled={loading || !teacherName.trim()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
