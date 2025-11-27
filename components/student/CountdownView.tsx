'use client';

import { useStudentStore } from '@/store/studentStore';
import { StaffTimeline } from '@/components/StaffTimeline';
import type { NoteValue } from '@/types/game';

/**
 * CountdownView - Full-screen countdown (3-2-1-GO!)
 *
 * Pure presentational component - reads countdown from Zustand store
 */
export function CountdownView() {
  const { countdown, currentSegment, gameData, gameConfig } = useStudentStore();

  const noteValue: NoteValue =
    currentSegment?.noteValue ||
    gameData?.segments?.[0]?.noteValue ||
    (gameConfig?.noteValues?.[0] as NoteValue) ||
    'quarter';

  const measuresPerSegment =
    gameData?.config?.measuresPerSegment ||
    gameData?.config?.segmentDuration ||
    gameConfig?.measuresPerSegment ||
    1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex flex-col items-center justify-center gap-8 p-4">
      <StaffTimeline noteValue={noteValue} measuresPerSegment={measuresPerSegment} isCountIn />

      <div className="text-center text-white">
        <div className="text-[200px] sm:text-[280px] font-bold leading-none animate-pulse drop-shadow-lg">
          {countdown === 0 ? 'GO!' : countdown}
        </div>
      </div>
    </div>
  );
}
