'use client';

import { useEffect, useState } from 'react';
import type { MilestoneEvent } from '@/types/game';

interface MilestoneToastProps {
  milestones: MilestoneEvent[];
}

export function MilestoneToast({ milestones }: MilestoneToastProps) {
  const [visibleMilestones, setVisibleMilestones] = useState<MilestoneEvent[]>([]);

  useEffect(() => {
    if (milestones.length === 0) return;

    // Get the latest milestone
    const latestMilestone = milestones[milestones.length - 1];

    // Replace any existing toast with the new one (only one at a time)
    setVisibleMilestones([latestMilestone]);

    // Remove it after 3 seconds
    const timeout = setTimeout(() => {
      setVisibleMilestones([]);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [milestones]);

  if (visibleMilestones.length === 0) {
    return null;
  }

  return (
    <div className="
      fixed
      bottom-4 left-1/2 -translate-x-1/2
      sm:top-20 sm:left-4 sm:translate-x-0
      z-50
      pointer-events-none
      w-[calc(100%-2rem)] sm:w-auto sm:max-w-xs
    ">
      {visibleMilestones.map((milestone) => (
        <div
          key={milestone.id}
          className="animate-in slide-in-from-bottom-5 sm:slide-in-from-left-5 fade-in duration-300"
        >
          <div className="
            bg-gradient-to-r from-purple-600/90 to-pink-600/90
            backdrop-blur-md text-white
            px-4 py-2 sm:px-6 sm:py-3
            rounded-full shadow-2xl border border-white/30
          ">
            <div className="flex items-center gap-2 sm:gap-3 justify-center">
              {milestone.icon && (
                <span className="text-base sm:text-3xl flex-shrink-0">{milestone.icon}</span>
              )}
              <span className="text-xs sm:text-lg font-bold text-center leading-tight">
                {milestone.message}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
