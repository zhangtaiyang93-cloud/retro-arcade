export const WORLD_WIDTH = 2172;
export const WORLD_HEIGHT = 724;
export const WALK_SPEED = 290;
export const INTERACTION_MS = 1800;
export const HALL_POSITION_KEY = 'retro_arcade_hall_position';
export const WALK_MIN_X = 245;
export const WALK_MAX_X = 2020;
export const WALK_FEET_Y = 590;

export const LOST_TICKETS = {
  stool: { amount: 8, title: 'STICKY SITUATION', message: 'Someone paid eight tickets to a piece of chewing gum. You negotiated a refund.' },
  trash: { amount: 10, title: 'NIGHT SHIFT MANAGER', message: 'The raccoon accepts your application. Your first paycheck: ten slightly crumpled tickets.' },
  snacks: { amount: 12, title: 'CHANGE OF PLANS', message: 'You asked for a snack. The machine has decided you need twelve tickets instead.' },
  boxes: { amount: 10, title: 'VERY IMPORTANT BOX', message: 'A box marked “DO NOT LOSE” contains exactly what somebody lost.' },
} as const;
export type PickupId = keyof typeof LOST_TICKETS;

export interface HallTarget {
  id: string;
  kind: 'game' | 'prizes' | 'pickup' | 'exit';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  slug?: string;
  pickup?: PickupId;
}
// Coordinates use the approved 2172 × 724 scene, independent of camera/viewport size.
export const HALL_TARGETS: HallTarget[] = [
  { id: 'exit', kind: 'exit', label: 'Exit / Finish Night', x: 130, y: 230, width: 125, height: 258, radius: 175 },
  { id: 'invaders', kind: 'game', label: 'Space Invaders', slug: 'space-invaders', x: 365, y: 252, width: 143, height: 272, radius: 72 },
  { id: 'chroma', kind: 'game', label: 'Chroma Chase', slug: 'chroma-chase', x: 512, y: 251, width: 134, height: 279, radius: 64 },
  { id: 'bricks', kind: 'game', label: 'Brick Breaker', slug: 'brick-breaker', x: 1002, y: 259, width: 151, height: 253, radius: 70 },
  { id: 'plumber', kind: 'game', label: 'Super Neon Plumber', slug: 'neon-mario', x: 1144, y: 248, width: 136, height: 266, radius: 66 },
  { id: 'snake', kind: 'game', label: 'Cyber Neon Snake', slug: 'neon-snake', x: 1481, y: 266, width: 143, height: 265, radius: 70 },
  { id: 'slots', kind: 'game', label: 'Neon Luck', slug: 'neon-slots', x: 1622, y: 255, width: 140, height: 270, radius: 65 },
  { id: 'counter', kind: 'prizes', label: 'Prize Counter', x: 1960, y: 374, width: 405, height: 151, radius: 135 },
  { id: 'stool', kind: 'pickup', label: 'Wobbly stool', pickup: 'stool', x: 440, y: 454, width: 76, height: 94, radius: 38 },
  { id: 'trash', kind: 'pickup', label: 'Old trash can', pickup: 'trash', x: 710, y: 339, width: 76, height: 102, radius: 48 },
  { id: 'snacks', kind: 'pickup', label: 'Snack machine', pickup: 'snacks', x: 838, y: 213, width: 170, height: 225, radius: 48 },
  { id: 'boxes', kind: 'pickup', label: 'Cardboard boxes', pickup: 'boxes', x: 1870, y: 471, width: 117, height: 70, radius: 43 },
];

export function clampPosition(x: number) {
  return Math.max(WALK_MIN_X, Math.min(WALK_MAX_X, Number.isFinite(x) ? x : 260));
}
export function stepPosition(x: number, direction: number, seconds: number, destination: number | null) {
  // Walking has no collision simulation; preserve real-time speed on slow frames.
  // A hidden tab clears its input/destination, so resuming cannot teleport the player.
  const delta = WALK_SPEED * Math.max(0, Math.min(1, seconds));
  if (direction) return clampPosition(x + Math.sign(direction) * delta);
  if (destination === null) return clampPosition(x);
  return clampPosition(x + Math.sign(destination - x) * Math.min(delta, Math.abs(destination - x)));
}
export function targetAvailable(target: HallTarget, collected: readonly PickupId[] = []) {
  return !target.pickup || !collected.includes(target.pickup);
}
export function nearestTarget(x: number, collected: readonly PickupId[] = []): HallTarget | undefined {
  const target = HALL_TARGETS.filter(target => Math.abs(x - target.x) <= target.radius)
    .sort((a, b) => Math.abs(x - a.x) - Math.abs(x - b.x))[0];
  return target && targetAvailable(target, collected) ? target : undefined;
}
export function cameraOffset(x: number, width: number, scale: number) {
  return Math.max(0, Math.min(WORLD_WIDTH * scale - width, x * scale - width / 2));
}
