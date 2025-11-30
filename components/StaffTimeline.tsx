'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import staffAnimation from '@/public/graphics/music-staff.json';
import { NoteImage } from '@/components/NoteImage';
import type { NoteValue } from '@/types/game';
import { getStaffNotePositions } from '@/lib/staff-layout';

interface StaffTimelineProps {
  noteValue: NoteValue;
  measuresPerSegment?: number;
  isCountIn?: boolean;
  tempo?: number; // BPM - used to scale animation speed
}

const FINAL_FRAME = (staffAnimation.op ?? 140) - 1;

// Animation timing - matches original Lottie file
// Original: 140 frames at 60fps, notes start at frame 27, stagger by 4.5 frames, end at frame 90
const LOTTIE_BASE_DURATION_MS = (140 / 60) * 1000; // ~2333ms
const TIME_SIG_START_FRAME = 24; // Time signature drops after treble clef (frame 22.5) but before notes
const NOTE_START_FRAME = 27; // Notes start dropping after time signature
const NOTE_STAGGER_FRAMES = 4.5; // Frames between each note
const NOTE_END_FRAME = 90; // All elements reach final position

// Animation speed limits
const MIN_ANIMATION_SPEED = 1; // ← Minimum speed (for slow tempos)
const MAX_ANIMATION_SPEED = 3; // ← Maximum speed (for fast tempos)
const BASE_TEMPO = 90; // ← Tempo at which animation runs at 1x speed

// NOTE POSITIONING - Adjust these values to fix note placement:
// Vertical position (top of staff = 0%, bottom = 100%)
const NOTE_TOP_DEFAULT = '54%'; // ← Default vertical position for all notes

// Note-specific vertical positions (overrides default)
const NOTE_TOP_OVERRIDES: Partial<Record<NoteValue, string>> = {
  whole: '62.5%', // ← Adjust whole note vertical position here
  // Add other note types as needed: 'half': '57%', 'quarter': '56%', etc.
};

// Note size in pixels
const NOTE_SIZE_DEFAULT = 85; // ← Default note size for all notes

// Note-specific sizes (overrides default)
const NOTE_SIZE_OVERRIDES: Partial<Record<NoteValue, number>> = {
  whole: 55, // ← Adjust whole note size here
  // Add other note types as needed: 'half': 95, 'quarter': 100, etc.
};

// Eighth note graphic positioning (for 4_eighth_notes.png)
// Horizontal positions (0% = left edge of staff, 100% = right edge)
const EIGHTH_NOTES_FIRST_GROUP_LEFT = '47%'; // ← Center position of first 4 notes
const EIGHTH_NOTES_SECOND_GROUP_LEFT = '78%'; // ← Center position of second 4 notes
const EIGHTH_NOTES_GROUP_WIDTH = '27%'; // ← Width of each 4-note group

// Vertical position (top of staff = 0%, bottom = 100%)
const EIGHTH_NOTES_TOP = '56%'; // ← Vertical position of eighth notes graphic

// Eighth note graphic sizing (in pixels)
const EIGHTH_NOTES_WIDTH = 340; // ← Width in pixels
const EIGHTH_NOTES_HEIGHT = 85; // ← Height in pixels

export function StaffTimeline({ noteValue, measuresPerSegment, isCountIn, tempo = 90 }: StaffTimelineProps) {
  const notePositions = useMemo(
    () => getStaffNotePositions(noteValue, measuresPerSegment),
    [noteValue, measuresPerSegment]
  );
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Get note-specific positioning and sizing
  const noteTop = NOTE_TOP_OVERRIDES[noteValue] || NOTE_TOP_DEFAULT;
  const noteSize = NOTE_SIZE_OVERRIDES[noteValue] || NOTE_SIZE_DEFAULT;

  // Calculate animation timing based on tempo
  // Count-in is 4 beats, so duration = (60 / tempo) * 4 seconds
  const countInDurationMs = (60 / tempo) * 4 * 1000;
  
  // Calculate animation speed: faster tempo = faster animation
  // Speed scales linearly with tempo, clamped between min and max
  const rawSpeed = tempo / BASE_TEMPO;
  const animationSpeed = Math.min(MAX_ANIMATION_SPEED, Math.max(MIN_ANIMATION_SPEED, rawSpeed));
  
  // Calculate note timing to match original Lottie proportions
  // Frame timing at 60fps, scaled by animation speed
  const msPerFrame = (1000 / 60) / animationSpeed;
  const timeSigStartDelayMs = TIME_SIG_START_FRAME * msPerFrame; // When time signature starts
  const timeSigDropDurationMs = (NOTE_END_FRAME - TIME_SIG_START_FRAME) * msPerFrame; // Time sig drop duration
  const noteStartDelayMs = NOTE_START_FRAME * msPerFrame; // When first note starts
  const noteStaggerMs = NOTE_STAGGER_FRAMES * msPerFrame; // Delay between notes
  const noteDropDurationMs = (NOTE_END_FRAME - NOTE_START_FRAME) * msPerFrame; // How long the drop takes

  // Track if we've already played the animation to prevent re-animation on state change
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const animation = lottieRef.current;
    if (!animation) return;

    animation.setSpeed(animationSpeed);
    
    if (isCountIn && !hasPlayedRef.current) {
      // First time playing - start the animation
      hasPlayedRef.current = true;
      animation.goToAndPlay(0, true);
    } else if (!isCountIn) {
      // When switching to playing mode, just ensure we're at final frame
      animation.pause();
      animation.goToAndStop(FINAL_FRAME, true);
    }
  }, [isCountIn, animationSpeed]);

  // Reset the played flag when component unmounts or noteValue changes
  useEffect(() => {
    hasPlayedRef.current = false;
  }, [noteValue]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative w-full">
        <div className="relative w-full" style={{ paddingBottom: '55%' }}>
          <Lottie
            animationData={staffAnimation}
            loop={false}
            autoplay={false}
            lottieRef={lottieRef}
            className="absolute inset-0 pointer-events-none"
          />

          <div className="absolute inset-0 pointer-events-none">
            {/* Time signature - drops after treble clef but before notes */}
            {/* Note: top/left adjusted to account for transform: translate(-50%, -50%) from animation */}
            <div 
              className={`absolute drop-shadow-2xl ${isCountIn ? 'animate-note-drop' : 'note-static'}`}
              style={{
                top: '49.5%',
                left: '26.5%',
                width: '35%',
                height: '35%',
                ...(isCountIn ? {
                  animationDuration: `${timeSigDropDurationMs}ms`,
                  animationDelay: `${timeSigStartDelayMs}ms`,
                  animationFillMode: 'forwards',
                } : {}),
              }}
            >
              <Image
                src="/graphics/4_4.png"
                alt="4/4 time signature"
                fill
                sizes="10vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Note positions are calculated in lib/staff-layout.ts - adjust MEASURE_LAYOUTS there */}
            {/* Always shows one measure worth of notes, regardless of segment length */}
            {noteValue === 'eighth' ? (
              // Special handling for eighth notes: use 4_eighth_notes.png twice
              <>
                {/* First group of 4 eighth notes */}
                <div
                  className={`absolute ${isCountIn ? 'animate-note-drop' : 'note-static'}`}
                  style={{
                    left: EIGHTH_NOTES_FIRST_GROUP_LEFT,
                    top: EIGHTH_NOTES_TOP,
                    width: EIGHTH_NOTES_GROUP_WIDTH,
                    ...(isCountIn ? {
                      animationDuration: `${noteDropDurationMs}ms`,
                      animationDelay: `${noteStartDelayMs}ms`,
                      animationFillMode: 'forwards',
                    } : {}),
                  }}
                >
                  <Image
                    src="/graphics/4_eighth_notes.png"
                    alt="4 eighth notes"
                    width={EIGHTH_NOTES_WIDTH}
                    height={EIGHTH_NOTES_HEIGHT}
                    className="drop-shadow-xl"
                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    unoptimized
                  />
                </div>
                {/* Second group of 4 eighth notes */}
                <div
                  className={`absolute ${isCountIn ? 'animate-note-drop' : 'note-static'}`}
                  style={{
                    left: EIGHTH_NOTES_SECOND_GROUP_LEFT,
                    top: EIGHTH_NOTES_TOP,
                    width: EIGHTH_NOTES_GROUP_WIDTH,
                    ...(isCountIn ? {
                      animationDuration: `${noteDropDurationMs}ms`,
                      animationDelay: `${noteStartDelayMs + noteStaggerMs}ms`,
                      animationFillMode: 'forwards',
                    } : {}),
                  }}
                >
                  <Image
                    src="/graphics/4_eighth_notes.png"
                    alt="4 eighth notes"
                    width={EIGHTH_NOTES_WIDTH}
                    height={EIGHTH_NOTES_HEIGHT}
                    className="drop-shadow-xl"
                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    unoptimized
                  />
                </div>
              </>
            ) : (
              // Regular rendering for other note types
              notePositions.map((note, index) => (
                <div
                  key={`${noteValue}-${index}`}
                  className={`absolute ${isCountIn ? 'animate-note-drop' : 'note-static'}`}
                  style={{
                    left: `${note.position * 100}%`,
                    top: noteTop,
                    transform: 'translateX(-50%) translateY(-50%)',
                    ...(isCountIn ? {
                      animationDuration: `${noteDropDurationMs}ms`,
                      animationDelay: `${noteStartDelayMs + (noteStaggerMs * index)}ms`,
                      animationFillMode: 'forwards',
                    } : {}),
                  }}
                >
                  <NoteImage
                    noteValue={noteValue}
                    size={noteSize}
                    className="drop-shadow-xl"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

