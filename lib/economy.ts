export const ECONOMY = {
  maxTicketsPerSecond: 2, marioSeconds: 90, brickSeconds: 120, mazeSeconds: 180,
  prizeCollectionCost: 935, hiddenEndingTickets: 9350, lostTickets: [8, 10, 12, 10],
} as const;
export const marioReward = (score: number, coins: number, win: boolean) =>
  Math.min(80, Math.max(0, coins) + Math.floor(Math.max(0, score) / 160) + (win ? 20 : 0));
export const brickReward = (score: number, cleared: number, win: boolean) =>
  Math.min(100, Math.max(0, cleared) + Math.floor(Math.max(0, score) / 120) + (win ? 20 : 0));
export const snakeReward = (foods: number, gold: number) => foods * 2 + gold * 5;
export const invaderWaveBonus = (wave: number) => Math.min(18, 6 + (wave - 1) * 2);

// No free participation reward. The per-round rate ceiling sums across rounds;
// fast restarting cannot bypass it. Local prototype, not server anti-cheat.
export class RoundBank {
  startedAt = 0; raw = 0; paid = 0; active = false;
  start(now: number) { this.startedAt = now; this.raw = 0; this.paid = 0; this.active = true; }
  update(raw: number, now: number, finish = false) {
    if (!this.active) return 0;
    this.raw = Math.max(this.raw, Math.floor(raw));
    const ceiling = Math.floor(Math.max(0, now - this.startedAt) / 1000 * ECONOMY.maxTicketsPerSecond);
    const allowed = Math.min(this.raw, ceiling);
    const delta = Math.max(0, allowed - this.paid);
    this.paid += delta;
    if (finish) this.active = false;
    return delta;
  }
}
