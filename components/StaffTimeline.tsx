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
}

const FINAL_FRAME = (staffAnimation.op ?? 140) - 1;

// NOTE POSITIONING - Adjust these values to fix note placement:
// Vertical position (top of staff = 0%, bottom = 100%)
const NOTE_TOP_DEFAULT = '54%'; // ← Default vertical position for all notes

// Note-specific vertical positions (overrides default)
const NOTE_TOP_OVERRIDES: Partial<Record<NoteValue, string>> = {
  whole: '62.5%', // ← Adjust whole note vertical position here
  // Add other note types as needed: 'half': '57%', 'quarter': '56%', etc.
};

// Note size in pixels (responsive via CSS clamp or viewport units)
const NOTE_SIZE_COUNT_IN_DEFAULT = 100; // ← Default count-in note size (reduced from 120)
const NOTE_SIZE_PLAYING_DEFAULT = 85; // ← Default playing note size (reduced from 100)

// Note-specific sizes (overrides default)
const NOTE_SIZE_COUNT_IN_OVERRIDES: Partial<Record<NoteValue, number>> = {
  whole: 90, // ← Adjust whole note count-in size here
  // Add other note types as needed: 'half': 110, 'quarter': 120, etc.
};

const NOTE_SIZE_PLAYING_OVERRIDES: Partial<Record<NoteValue, number>> = {
  whole: 55, // ← Adjust whole note playing size here
  // Add other note types as needed: 'half': 95, 'quarter': 100, etc.
};

export function StaffTimeline({ noteValue, measuresPerSegment, isCountIn }: StaffTimelineProps) {
  const notePositions = useMemo(
    () => getStaffNotePositions(noteValue, measuresPerSegment),
    [noteValue, measuresPerSegment]
  );
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Get note-specific positioning and sizing
  const noteTop = NOTE_TOP_OVERRIDES[noteValue] || NOTE_TOP_DEFAULT;
  const noteSizeCountIn = NOTE_SIZE_COUNT_IN_OVERRIDES[noteValue] || NOTE_SIZE_COUNT_IN_DEFAULT;
  const noteSizePlaying = NOTE_SIZE_PLAYING_OVERRIDES[noteValue] || NOTE_SIZE_PLAYING_DEFAULT;

  useEffect(() => {
    const animation = lottieRef.current;
    if (!animation) return;

    if (isCountIn) {
      animation.play();
    } else {
      animation.pause();
      animation.goToAndStop(FINAL_FRAME, true);
    }
  }, [isCountIn]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative w-full overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md shadow-lg border border-white/20">
        <div className="relative w-full" style={{ paddingBottom: '55%' }}>
          <Lottie
            animationData={staffAnimation}
            loop={isCountIn}
            autoplay={isCountIn}
            lottieRef={lottieRef}
            className="absolute inset-0 pointer-events-none"
          />

          <div className="absolute inset-0 pointer-events-none">
            {/* Time signature - responsive sizing */}
            <div 
              className="absolute drop-shadow-2xl relative"
              style={{
                top: '32%',
                left: '9%',
                width: '35%',
                height: '35%',
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
            {notePositions.map((note, index) => (
              <div
                key={`${noteValue}-${index}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                style={{
                  left: `${note.position * 100}%`, // ← Horizontal position (0% = left, 100% = right)
                  top: noteTop, // ← Vertical position - see NOTE_TOP_OVERRIDES above
                }}
              >
                <NoteImage
                  noteValue={noteValue}
                  size={isCountIn ? noteSizeCountIn : noteSizePlaying}
                  className={isCountIn ? 'animate-bounce drop-shadow-2xl' : 'drop-shadow-xl'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

