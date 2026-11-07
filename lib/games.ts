export interface ArcadeGame {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  author: string;
  genre: string;
  icon: string;
  accentColor: string; // Neon hex color
  cabinetColor: string;
  status: 'Coming Soon' | 'Ready' | 'Beta';
  ticketReward: string;
  description: string;
  controlsTip: string;
}

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: 'game-6',
    slug: 'neon-slots',
    title: 'NEON LUCK',
    tagline: 'One spin could change your night.',
    author: 'Ruby Pann',
    genre: 'High-Stakes Ticket Slots',
    icon: '🎰',
    accentColor: '#ffe600',
    cabinetColor: '#302018',
    status: 'Ready',
    ticketReward: '0 – 10,000 🎟️',
    description: 'Stake 50 tickets on three neon reels. Break even, multiply your tickets, or lose your stake. Triple sevens return 10,000 tickets!',
    controlsTip: '50 tickets per spin. Click or tap SPIN.'
  },
  {
    id: 'game-1',
    slug: 'space-invaders',
    title: 'Space Invaders',
    tagline: 'Defend earth from pixelated alien waves!',
    author: 'Caoyun Xu',
    genre: 'Retro Arcade Shooter',
    icon: '👾',
    accentColor: '#00ffcc', // Neon Cyan
    cabinetColor: '#162b4d',
    status: 'Ready',
    ticketReward: '1 / alien + 6–18 / wave',
    description: 'Survive unlimited waves of pixel invaders. Bank tickets for each alien and wave; enemies get faster as you survive.',
    controlsTip: 'Arrow keys to steer, Spacebar to shoot lasers.'
  },
  {
    id: 'game-2',
    slug: 'chroma-chase',
    title: 'NEON FEVER: CHROMA CHASE',
    tagline: 'Outrun four digital creatures, then turn the chase around!',
    author: 'Jiaqi (jyuan)',
    genre: 'Neon Maze Chase (Pac-Man Style)',
    icon: '🌀',
    accentColor: '#8B5CF6', // Electric Violet
    cabinetColor: '#190B35',
    status: 'Ready',
    ticketReward: 'Up to 191 🎟️ / 180s',
    description: 'A 180-second maze challenge: 1 ticket per 6 pickups, level bonuses of 20/25/25, plus 10 for each no-damage clear.',
    controlsTip: 'Arrow keys or WASD. Touch D-pad or swipe on mobile.'
  },
  {
    id: 'game-3',
    slug: 'brick-breaker',
    title: 'Brick Breaker',
    tagline: 'Smash through neon brick barricades!',
    author: 'Taiyang',
    genre: 'Arcade Paddle Action',
    icon: '🧱',
    accentColor: '#ff007f', // Neon Magenta
    cabinetColor: '#3b122f',
    status: 'Ready',
    ticketReward: 'Up to 99 🎟️ / 120s',
    description: '120 seconds to clear 40 neon bricks. Bank 1 ticket per brick plus score rewards, with a 20-ticket clear bonus.',
    controlsTip: 'Mouse, A/D, or Arrow keys to slide your paddle.'
  },
  {
    id: 'game-4',
    slug: 'neon-mario',
    title: 'Super Neon Plumber',
    tagline: 'Run, jump, bump ? blocks & conquer the flagpole!',
    author: 'Taiyang',
    genre: 'Side-Scrolling Platformer',
    icon: '🍄',
    accentColor: '#ff3b30', // Mario Red
    cabinetColor: '#3a1414',
    status: 'Ready',
    ticketReward: 'Up to 62 🎟️ / 90s',
    description: 'A free 90-second platform challenge. Collect coins, stomp enemies and reach the flag for a 20-ticket bonus. Progress banks live.',
    controlsTip: 'A/D or Arrows to run, Space/W to jump. Stomp enemies from above!'
  },
  {
    id: 'game-5',
    slug: 'neon-snake',
    title: 'Cyber Neon Snake',
    tagline: 'Slither through the grid, feast on energy orbs & grow!',
    author: 'Taiyang',
    genre: 'Retro Grid Action',
    icon: '🐍',
    accentColor: '#39ff14', // Neon Green
    cabinetColor: '#0d2818',
    status: 'Ready',
    ticketReward: '2 / orb · 5 / gold',
    description: 'Endless high-speed survival. Bank 2 tickets per orb and 5 per golden orb; movement accelerates as your snake grows.',
    controlsTip: 'Arrow keys or WASD to navigate, or on-screen D-Pad.'
  }
];

export function getGameBySlug(slug: string): ArcadeGame | undefined {
  if (slug === 'pac-man') {
    return ARCADE_GAMES.find((g) => g.slug === 'chroma-chase');
  }
  return ARCADE_GAMES.find((g) => g.slug === slug);
}
