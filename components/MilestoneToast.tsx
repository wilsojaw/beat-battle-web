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

    // Add it to visible milestones, but limit to 2 max
    setVisibleMilestones((prev) => {
      const newList = [...prev, latestMilestone];
      // Keep only the last 2 milestones
      return newList.slice(-2);
    });

    // Remove it after 3 seconds
    const timeout = setTimeout(() => {
      setVisibleMilestones((prev) =>
        prev.filter((m) => m.id !== latestMilestone.id)
      );
    }, 3000);

    return () => clearTimeout(timeout);
  }, [milestones]);

  if (visibleMilestones.length === 0) {
    return null;
  }

  return (
    <div className="
      fixed
      top-20 left-4
      z-50 flex flex-col gap-2
      pointer-events-none
      max-w-xs sm:max-w-sm
    ">
      {visibleMilestones.map((milestone) => (
        <div
          key={milestone.id}
          className="animate-in slide-in-from-left-5 fade-in duration-300"
        >
          <div className="
            bg-gradient-to-r from-purple-600/90 to-pink-600/90
            backdrop-blur-md text-white
            px-3 py-2 sm:px-6 sm:py-3
            rounded-full shadow-2xl border border-white/30
          ">
            <div className="flex items-center gap-2 sm:gap-3 justify-center">
              <span className="text-xl sm:text-3xl flex-shrink-0">{milestone.icon}</span>
              <span className="text-sm sm:text-lg font-bold text-center leading-tight">
                {milestone.message}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
