// One-time ticket claims for Chroma Chase. The shared wallet's addTickets() has no idempotency of
// its own, so every award first has to win a claim here.
//
// Known limits, which can only be closed inside the shared wallet:
// - Each tab holds its own wallet balance and the last save wins, so playing in two tabs at once
//   can overwrite tickets even though each claim here only pays once.
// - addTickets() gives no confirmation, so a claim is recorded before the wallet has saved.
// - Claims live in this browser's localStorage, so clearing site data clears them too.
// - Each new game is a new session, so replaying and clearing a level again earns tickets again.

import { REWARDS } from './config';

const CLAIMS_KEY = 'chroma_chase_reward_claims_v1';
const MAX_STORED_CLAIMS = 200;

/** Still blocks duplicates in this page when localStorage is unavailable. */
const claimedThisPage = new Set<string>();

export interface Reward {
  achievementId: string;
  amount: number;
  reason: string;
}

export function createSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readClaims(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLAIMS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returns true the first time an achievement is claimed and false every time after.
 * The claim is saved before the caller pays out, so a crash can lose a reward but never repeat it.
 */
export function claimOnce(achievementId: string): boolean {
  if (claimedThisPage.has(achievementId)) return false;
  const stored = readClaims();
  claimedThisPage.add(achievementId);
  if (stored.includes(achievementId)) return false;
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify([...stored, achievementId].slice(-MAX_STORED_CLAIMS)));
  } catch {
    // Storage unavailable: the in-page set above still applies.
  }
  return true;
}

export function rewardsForLevelClear(sessionId: string, level: number, noDamage: boolean): Reward[] {
  const levelNumber = level + 1;
  const rewards: Reward[] = [
    {
      achievementId: `${sessionId}:level-${levelNumber}:clear`,
      amount: level === 0 ? REWARDS.firstLevelClear : REWARDS.laterLevelClear,
      reason: `Chroma Chase level ${levelNumber} clear`
    }
  ];
  if (noDamage) {
    rewards.push({
      achievementId: `${sessionId}:level-${levelNumber}:no-damage`,
      amount: REWARDS.noDamageBonus,
      reason: `Chroma Chase level ${levelNumber} no-damage bonus`
    });
  }
  return rewards;
}
