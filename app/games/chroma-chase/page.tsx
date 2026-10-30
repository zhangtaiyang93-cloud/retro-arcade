import type { Metadata } from 'next';
import ChromaChase from '@/components/games/chroma-chase/ChromaChase';

export const metadata: Metadata = {
  title: 'NEON FEVER: CHROMA CHASE | Retro Arcade',
  description: 'A psychedelic neon maze chase with a shape-shifting energy orb and four original digital creatures.'
};

export default function ChromaChasePage() {
  return <ChromaChase />;
}
