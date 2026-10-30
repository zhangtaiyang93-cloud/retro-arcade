// All Chroma Chase tuning lives here, so rewards and difficulty can change without touching game logic.

export const PALETTE = {
  background: '#080612',
  deepPurple: '#190B35',
  pink: '#FF2BD6',
  cyan: '#00F5FF',
  acid: '#C6FF00',
  violet: '#8B5CF6',
  yellow: '#FFE600'
} as const;

/** Tickets paid through the shared wallet. Particles, cores and creatures only ever add score. */
export const REWARDS = {
  firstLevelClear: 50,
  laterLevelClear: 75,
  noDamageBonus: 25
};

export const SCORE = {
  particle: 10,
  core: 50,
  /** Doubles for each creature caught during a single surge. */
  firstCreature: 200
};

export interface LevelConfig {
  /** Creature speed as a fraction of the orb's speed. */
  creatureSpeed: number;
  surgeSeconds: number;
  /** Seconds between creatures leaving the den. */
  releaseInterval: number;
  huntSeconds: number;
  driftSeconds: number;
  /** Maze gradient for this level. */
  theme: [string, string, string];
}

export const LEVELS: LevelConfig[] = [
  { creatureSpeed: 0.7, surgeSeconds: 8, releaseInterval: 5, huntSeconds: 10, driftSeconds: 8, theme: [PALETTE.pink, PALETTE.violet, PALETTE.cyan] },
  { creatureSpeed: 0.78, surgeSeconds: 6.5, releaseInterval: 4, huntSeconds: 14, driftSeconds: 6, theme: [PALETTE.cyan, PALETTE.acid, PALETTE.violet] },
  { creatureSpeed: 0.86, surgeSeconds: 5, releaseInterval: 3, huntSeconds: 18, driftSeconds: 5, theme: [PALETTE.acid, PALETTE.pink, PALETTE.yellow] }
];

export const GAME = {
  startingLives: 3,
  /** Orb speed in maze tiles per second. */
  orbSpeed: 6,
  vulnerableSpeedFactor: 0.6,
  returningSpeed: 11,
  /** Lancer's speed multiplier while it can see the orb down a corridor. */
  lancerChargeFactor: 1.15,
  lancerSightTiles: 8,
  wardenAlertTiles: 5,
  mirrorcoilChaseTiles: 3,
  glitchlingBlinkEvery: 8,
  glitchlingWarningSeconds: 0.7,
  glitchlingMinBlinkDistance: 8,
  respawnSeconds: 1,
  countdownSeconds: 3,
  hitSeconds: 1.4,
  levelClearSeconds: 3,
  invulnerableSeconds: 1.2,
  surgeWarningSeconds: 2,
  /** How close, in tiles, the orb and a creature must be to touch. */
  touchDistance: 0.62
};
