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
    slug: 'pac-man',
    title: 'Pac-Man',
    tagline: 'Chomp the dots, outsmart the neon ghosts!',
    author: 'Teammate 2',
    genre: 'Classic Maze Chase',
    icon: '🍒',
    accentColor: '#ffe600', // Neon Yellow
    cabinetColor: '#3a2e12',
    status: 'Coming Soon',
    ticketReward: '20 - 75 🎟️',
    description: 'Navigate the glowing neon labyrinth, collect power pellets to turn the tables on ghosts, and rack up ticket rewards.',
    controlsTip: 'Arrow keys or WASD to navigate the maze corridors.'
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
  }
];

export function getGameBySlug(slug: string): ArcadeGame | undefined {
  return ARCADE_GAMES.find((g) => g.slug === slug);
}
