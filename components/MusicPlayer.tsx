'use client';

import { useCallback } from 'react';
import { chipAudio, SOUNDTRACK } from '@/lib/chip-audio';

// Lives above route changes: one recording, one playhead, no stacked loops.
export default function MusicPlayer() {
  const attach = useCallback((element: HTMLAudioElement | null) => chipAudio.attachMusic(element), []);
  return <audio id="arcade-soundtrack" ref={attach} src={SOUNDTRACK.src} loop preload="none" aria-label={`${SOUNDTRACK.title} by ${SOUNDTRACK.artist}`} />;
}
