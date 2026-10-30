export const WIDTH = 640;
export const HEIGHT = 440;
export type Phase = 'ready' | 'playing' | 'paused' | 'over' | 'won';
type Body = { x: number; y: number };
export type Invader = Body & { row: number };
export type GameState = {
  phase: Phase; player: number; lives: number; score: number; wave: number;
  earned: number; aliens: Invader[]; shots: Body[]; bombs: Body[];
  direction: number; cooldown: number; fireTimer: number; invincible: number;
};
export function formation(wave: number): Invader[] {
  return Array.from({ length: 24 }, (_, i) => ({ x: 80 + (i % 8) * 58, y: 48 + Math.floor(i / 8) * 42 + (wave - 1) * 8, row: Math.floor(i / 8) }));
}
export function createGame(): GameState {
  return { phase: 'ready', player: WIDTH / 2, lives: 3, score: 0, wave: 1, earned: 0,
    aliens: formation(1), shots: [], bombs: [], direction: 1, cooldown: 0, fireTimer: 1, invincible: 0 };
}
// Mutates only the game owned by the animation loop; returns newly earned tickets once.
export function stepGame(g: GameState, dt: number, input: { left: boolean; right: boolean; fire: boolean }, random = Math.random): number {
  if (g.phase !== 'playing') return 0;
  dt = Math.min(Math.max(dt, 0), 0.04);
  g.player = Math.max(20, Math.min(WIDTH - 20, g.player + (Number(input.right) - Number(input.left)) * 300 * dt));
  g.cooldown -= dt;
  g.invincible = Math.max(0, g.invincible - dt);
  if (input.fire && g.cooldown <= 0) { g.shots.push({ x: g.player, y: 390 }); g.cooldown = 0.22; }
  for (const shot of g.shots) shot.y -= 480 * dt;
  for (const bomb of g.bombs) bomb.y += (160 + g.wave * 22) * dt;
  const speed = 22 + g.wave * 10 + (24 - g.aliens.length) * 2;
  for (const alien of g.aliens) alien.x += g.direction * speed * dt;
  if (g.aliens.some(a => a.x < 22 || a.x > WIDTH - 22)) {
    g.direction *= -1;
    for (const alien of g.aliens) { alien.x = Math.max(22, Math.min(WIDTH - 22, alien.x)); alien.y += 18; }
  }
  g.fireTimer -= dt;
  if (g.fireTimer <= 0 && g.aliens.length) {
    const alien = g.aliens[Math.min(g.aliens.length - 1, Math.floor(random() * g.aliens.length))];
    g.bombs.push({ x: alien.x, y: alien.y + 14 });
    g.fireTimer = Math.max(0.28, 1.05 - g.wave * 0.18);
  }
  for (const shot of g.shots) {
    const index = g.aliens.findIndex(a => Math.abs(a.x - shot.x) < 20 && Math.abs(a.y - shot.y) < 16);
    if (index >= 0) { g.score += (3 - g.aliens[index].row) * 10; g.aliens.splice(index, 1); shot.y = -100; }
  }
  g.shots = g.shots.filter(s => s.y > -10);
  g.bombs = g.bombs.filter(b => {
    if (Math.abs(b.x - g.player) < 20 && b.y > 384 && b.y < 416) {
      if (g.invincible <= 0) { g.lives--; g.invincible = 1.6; }
      return false;
    }
    return b.y < HEIGHT + 10;
  });
  if (g.lives <= 0 || g.aliens.some(a => a.y >= 374)) { g.phase = 'over'; return 0; }
  if (!g.aliens.length) {
    const reward = g.wave * 10;
    g.earned += reward;
    g.shots = []; g.bombs = [];
    if (g.wave === 3) g.phase = 'won';
    else { g.wave++; g.aliens = formation(g.wave); g.direction = 1; g.fireTimer = 1; g.invincible = 1.6; }
    return reward;
  }
  return 0;
}
