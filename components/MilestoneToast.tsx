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

    // Add it to visible milestones
    setVisibleMilestones((prev) => [...prev, latestMilestone]);

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
      absolute
      top-16 left-1/2 -translate-x-1/2
      sm:top-24
      z-50 flex flex-col gap-2
      pointer-events-none
      w-[90%] sm:w-auto
      max-w-md sm:max-w-xl
    ">
      {visibleMilestones.map((milestone) => (
        <div
          key={milestone.id}
          className="animate-in slide-in-from-top-5 fade-in duration-300 animate-out slide-out-to-top-5 fade-out delay-2700"
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
