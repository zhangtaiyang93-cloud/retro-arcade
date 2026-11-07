export const NIGHT_MS = 30 * 60 * 1000;
export const ALL_PRIZES_COST = 935;
export const OWNER_TICKETS = ALL_PRIZES_COST * 10;
export const NIGHT_KEY = 'retro_arcade_night_v1';
export type Ending = 'complete' | 'closing' | 'owner';
export type EndReason = 'exit' | 'timeout';
export interface NightResult {
  ending: Ending;
  reason: EndReason;
  tickets: number;
  prizes: number;
  slotNet: number;
  elapsedMs: number;
}
export interface Night {
  id: string;
  startedAt: number;
  deadline: number;
  status: 'playing' | 'ended';
  slotNet: number;
  result?: NightResult;
}
export function timeLeft(night: Night | null, now: number) {
  return night?.status === 'playing' ? Math.max(0, night.deadline - now) : 0;
}
export function canEarn(night: Night | null, now: number) {
  return !!night && night.status === 'playing' && now < night.deadline;
}
export function settleNight(night: Night, reason: EndReason, tickets: number, prizes: number, now: number): Night {
  if (night.status === 'ended') return night;
  const actualReason = now >= night.deadline ? 'timeout' : reason;
  const ending: Ending = actualReason === 'exit' && tickets >= OWNER_TICKETS && night.slotNet > 0 ? 'owner'
    : actualReason === 'exit' && prizes === 6 ? 'complete' : 'closing';
  return { ...night, status: 'ended', result: { ending, reason: actualReason, tickets, prizes, slotNet: night.slotNet, elapsedMs: Math.max(0, Math.min(NIGHT_MS, now - night.startedAt)) } };
}
export function formatClock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function parseNight(raw: string | null): Night | null {
  try {
    const n = JSON.parse(raw || 'null');
    if (!n || typeof n.id !== 'string' || !Number.isFinite(n.startedAt) || !Number.isFinite(n.deadline) || n.deadline - n.startedAt !== NIGHT_MS || !Number.isSafeInteger(n.slotNet)) return null;
    if (n.status === 'playing') return { id: n.id, startedAt: n.startedAt, deadline: n.deadline, status: 'playing', slotNet: n.slotNet };
    if (n.status === 'ended' && n.result && ['complete', 'closing', 'owner'].includes(n.result.ending) && ['exit', 'timeout'].includes(n.result.reason)
      && Number.isSafeInteger(n.result.tickets) && n.result.tickets >= 0 && Number.isInteger(n.result.prizes) && n.result.prizes >= 0 && n.result.prizes <= 6 && Number.isFinite(n.result.elapsedMs)) return n;
  } catch { /* A damaged session starts at the title, without discarding the wallet. */ }
  return null;
}
