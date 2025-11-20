'use client';

import { useState } from 'react';
import type { GameTemplate } from '@/lib/game-templates';
import { GAME_TEMPLATES, getTemplatesByDifficulty } from '@/lib/game-templates';
import type { NoteValue } from '@/types/game';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: GameTemplate) => void;
}

const DIFFICULTY_COLORS = {
  Beginner: 'from-green-500 to-emerald-500',
  Intermediate: 'from-blue-500 to-cyan-500',
  Advanced: 'from-orange-500 to-amber-500',
  Expert: 'from-red-500 to-pink-500'
};

const DIFFICULTY_ORDER: GameTemplate['difficulty'][] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function TemplatePickerModal({ isOpen, onClose, onSelectTemplate }: TemplatePickerModalProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameTemplate['difficulty']>('Beginner');

  if (!isOpen) return null;

  const filteredTemplates = getTemplatesByDifficulty(selectedDifficulty);

  const handleSelect = (template: GameTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">📚 Game Templates</h2>
              <p className="text-purple-100">Choose a pre-configured template to get started quickly</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Difficulty Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-6">
          <div className="flex gap-2 overflow-x-auto py-4">
            {DIFFICULTY_ORDER.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedDifficulty === difficulty
                    ? `bg-gradient-to-r ${DIFFICULTY_COLORS[difficulty]} text-white shadow-lg scale-105`
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className="text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-lg transition-all group"
              >
                {/* Template Header */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-4xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-600 transition-colors">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${DIFFICULTY_COLORS[template.difficulty]}`}>
                        {template.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.suggestedGrades}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>

                {/* Settings Preview */}
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Tempo:</span>
                    <span className="font-semibold text-gray-700">♩ = {template.settings.tempo} BPM</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-semibold text-gray-700">{template.settings.totalMeasures} measures</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Note Values:</span>
                    <span className="font-semibold text-gray-700">{template.settings.noteValues.length} types</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Segment:</span>
                    <span className="font-semibold text-gray-700">{template.settings.measuresPerSegment} measure{template.settings.measuresPerSegment > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-center text-sm font-semibold text-purple-600 group-hover:text-purple-700">
                    Click to Apply →
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No templates found for this difficulty level.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-600">
            💡 Templates are pre-configured settings. You can modify them after selection.
          </p>
        </div>
      </div>
    </div>
  );
}
