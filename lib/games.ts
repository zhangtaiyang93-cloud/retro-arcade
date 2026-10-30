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
    ticketReward: '10 / 20 / 30 🎟️ per wave',
    description: 'Battle waves of descending pixel invaders, dodge enemy lasers, and clear three waves to earn up to 60 tickets.',
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
    ticketReward: 'Up to 275 🎟️',
    description: 'Steer a shape-shifting energy orb through a glowing maze, collect every energy particle, and grab energy cores to reverse the chase and chomp creatures across three levels.',
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
    ticketReward: 'Up to 50 🎟️',
    description: 'Keep the high-velocity energy sphere bouncing to shatter indestructible neon blocks and trigger ticket cascades.',
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
    ticketReward: '20 - 75 🎟️',
    description: 'Classic side-scrolling platformer action! Stomp patrolling goombas, headbutt ? mystery blocks for shiny coins, and leap onto the finish flagpole to bank huge ticket rewards.',
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
    ticketReward: '15 - 60 🎟️',
    description: 'Classic arcade snake reimagined with synthwave grid visuals, glowing energy orbs, speed multipliers, and real ticket rewards.',
    controlsTip: 'Arrow keys or WASD to navigate, or on-screen D-Pad.'
  }
];

export function getGameBySlug(slug: string): ArcadeGame | undefined {
  if (slug === 'pac-man') {
    return ARCADE_GAMES.find((g) => g.slug === 'chroma-chase');
  }
  return ARCADE_GAMES.find((g) => g.slug === slug);
}
