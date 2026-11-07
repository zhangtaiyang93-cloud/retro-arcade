export const SPIN_COST = 50;
export const SPIN_MS = 2400;
export const ODDS_TOTAL = 10000;

// Mutually exclusive basis-point weights. Returns INCLUDE the stake.
// E[return] = (3000*50+1500*100+400*200+90*500+5*10000)/10000 = 47.5.
export const SLOT_OUTCOMES = [
  { id: 'miss', label: 'NO MATCH', weight: 5005, payout: 0, symbols: ['CHERRY', 'BAR', '7'] },
  { id: 'pair', label: 'CHERRY PAIR', weight: 3000, payout: 50, symbols: ['CHERRY', 'CHERRY', 'BAR'] },
  { id: 'cherries', label: 'CHERRY TRIPLE', weight: 1500, payout: 100, symbols: ['CHERRY', 'CHERRY', 'CHERRY'] },
  { id: 'bars', label: 'BAR TRIPLE', weight: 400, payout: 200, symbols: ['BAR', 'BAR', 'BAR'] },
  { id: 'stars', label: 'STAR TRIPLE', weight: 90, payout: 500, symbols: ['STAR', 'STAR', 'STAR'] },
  { id: 'jackpot', label: 'NEON JACKPOT', weight: 5, payout: 10000, symbols: ['7', '7', '7'] },
] as const;
export type SlotOutcome = typeof SLOT_OUTCOMES[number];
export type SlotSymbol = SlotOutcome['symbols'][number];
export interface SpinReceipt { outcome: SlotOutcome; before: number; after: number; net: number; }

export function outcomeForRoll(roll: number): SlotOutcome {
  if (!Number.isInteger(roll) || roll < 0 || roll >= ODDS_TOTAL) throw new RangeError('Invalid slot roll');
  let boundary = 0;
  for (const outcome of SLOT_OUTCOMES) {
    boundary += outcome.weight;
    if (roll < boundary) return outcome;
  }
  throw new Error('Slot weights must total 10000');
}

export function randomSlotRoll(): number {
  // Rejection sampling avoids modulo bias. No adaptive odds or forced near misses.
  const limit = Math.floor(0x100000000 / ODDS_TOTAL) * ODDS_TOTAL;
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % ODDS_TOTAL;
}

export function settleSpin(balance: number, roll: number): SpinReceipt | null {
  if (!Number.isSafeInteger(balance) || balance < SPIN_COST) return null;
  const outcome = outcomeForRoll(roll);
  const after = balance - SPIN_COST + outcome.payout;
  if (!Number.isSafeInteger(after)) return null;
  return { outcome, before: balance, after, net: outcome.payout - SPIN_COST };
}
