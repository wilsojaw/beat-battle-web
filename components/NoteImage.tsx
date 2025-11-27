'use client';

import Image from 'next/image';
import { NoteValue, NOTE_VALUES } from '@/types/game';

interface NoteImageProps {
  noteValue: NoteValue;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Reusable component for displaying note images
 * Replaces Unicode symbols with actual note graphics
 */
export function NoteImage({ noteValue, size = 64, className = '', alt }: NoteImageProps) {
  const noteInfo = NOTE_VALUES[noteValue];
  const imageAlt = alt || noteInfo.displayName;
  const imageScale = noteInfo.imageScale ?? 1;

  return (
    <Image
      src={noteInfo.imagePath}
      alt={imageAlt}
      width={size}
      height={size}
      className={className}
      style={imageScale !== 1 ? { transform: `scale(${imageScale})` } : undefined}
      unoptimized // Since these are custom graphics, we'll use unoptimized for now
    />
  );
}

