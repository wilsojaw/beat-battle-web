import { NOTE_VALUES, type NoteValue } from '@/types/game';

const BEATS_PER_MEASURE = 4;

// NOTE HORIZONTAL POSITIONING - Adjust these values to fix note placement across the staff
// Each array contains relative positions (0.0 to 1.0) for notes within a single measure
// Values are relative to the measure width (0.0 = start of measure, 1.0 = end of measure)
// ← Change these arrays to adjust where notes appear horizontally within each measure
const MEASURE_LAYOUTS: Record<number, number[]> = {
  1: [0.4], // 1 note per measure (whole note) - positioned at beat 1, matching first quarter note
  2: [0.4, 0.68], // 2 notes per measure (half notes) - positioned at beats 1 and 3
  3: [0.18, 0.5, 0.78], // 3 notes per measure
  4: [0.38, 0.52, 0.66, 0.80], // 4 notes per measure (quarter notes) - moved left to prevent clipping on mobile
  6: [0.08, 0.24, 0.4, 0.56, 0.72, 0.88], // 6 notes per measure
  8: [0.4, 0.475, 0.55, 0.625, 0.7, 0.775, 0.85, 0.925], // 8 notes per measure (eighth notes) - uses grouped image, not affected
  16: Array.from({ length: 16 }, (_, i) => 0.04 + (i * 0.92) / 15), // 16 notes per measure (sixteenth notes)
};

function getNotesPerMeasure(noteValue: NoteValue) {
  const noteInfo = NOTE_VALUES[noteValue];
  const raw = noteInfo.tapsPerBeat * BEATS_PER_MEASURE;
  return Math.max(1, Math.round(raw));
}

function getMeasureLayout(noteCount: number) {
  if (MEASURE_LAYOUTS[noteCount]) {
    return MEASURE_LAYOUTS[noteCount];
  }

  // Fallback to evenly spaced notes if we don't have a preset layout.
  if (noteCount === 1) return [0.5];
  const spacing = 0.9 / (noteCount - 1);
  return Array.from({ length: noteCount }, (_, index) => 0.05 + spacing * index);
}

export function getStaffNoteCount(noteValue: NoteValue, measuresPerSegment?: number) {
  const notesPerMeasure = getNotesPerMeasure(noteValue);
  const measures = Math.max(1, Math.round(measuresPerSegment || 1));
  return notesPerMeasure * measures;
}

export function getStaffNotePositions(noteValue: NoteValue, measuresPerSegment?: number) {
  // Always show just one measure on the staff, regardless of segment length
  const notesPerMeasure = getNotesPerMeasure(noteValue);
  const layout = getMeasureLayout(notesPerMeasure);
  
  // Return positions directly from the layout (already 0.0 to 1.0 for a single measure)
  // No centering - positions are used as-is for individual control
  return layout.map((position) => ({
    position: Math.min(0.98, Math.max(0.02, position))
  }));
}

