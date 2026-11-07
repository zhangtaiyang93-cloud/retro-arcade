'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { randomSlotRoll, settleSpin, SPIN_MS, type SpinReceipt } from '@/lib/slots';
import { LOST_TICKETS, HALL_POSITION_KEY, type PickupId } from '@/lib/hall';
import { PRIZES, SHELF_STORAGE_KEY } from '@/lib/prizes';
import { NIGHT_KEY, NIGHT_MS, canEarn, parseNight, settleNight, timeLeft, type EndReason, type Night } from '@/lib/night';
import { chipAudio } from '@/lib/chip-audio';

interface TicketContextType {
  tickets: number;
  addTickets: (amount: number, reason?: string) => void;
  spendTickets: (amount: number, reason?: string) => boolean;
  resetTickets: () => void;
  lastTransactionMessage: string | null;
  spinSlots: () => SpinReceipt | null;
  isInitialized: boolean;
  collectedPickups: PickupId[];
  claimLostTickets: (id: PickupId) => number;
  wonPrizes: string[];
  redeemPrize: (id: string) => boolean;
  night: Night | null;
  remainingMs: number;
  startNight: () => void;
  finishNight: (reason: EndReason) => void;
}
const STORAGE_KEY = 'retro_arcade_tickets';
const WALLET_KEY = 'retro_arcade_wallet_v2';
const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState(0);
  const [lastTransactionMessage, setLastTransactionMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [night, setNight] = useState<Night | null>(null);
  const [remainingMs, setRemainingMs] = useState(NIGHT_MS);
  const nightRef = useRef<Night | null>(null);
  const balance = useRef(0);
  const nextSpinAt = useRef(0);
  const prizes = useRef<string[]>([]);
  const [wonPrizes, setWonPrizes] = useState<string[]>([]);
  const pickups = useRef<PickupId[]>([]);
  const [collectedPickups, setCollectedPickups] = useState<PickupId[]>([]);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const wallet = JSON.parse(localStorage.getItem(WALLET_KEY) || 'null');
      const parsed = wallet && Number.isSafeInteger(wallet.tickets) && wallet.tickets >= 0 ? wallet.tickets : Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (Number.isSafeInteger(parsed) && parsed >= 0) balance.current = parsed;
      if (Array.isArray(wallet?.pickups)) pickups.current = [...new Set<PickupId>(wallet.pickups.filter((id: string) => Object.hasOwn(LOST_TICKETS, id)))];
      const shelf = Array.isArray(wallet?.prizes) ? wallet.prizes : JSON.parse(localStorage.getItem(SHELF_STORAGE_KEY) || '[]');
      if (Array.isArray(shelf)) prizes.current = [...new Set<string>(shelf.filter((name: unknown): name is string => typeof name === 'string' && PRIZES.some(p => p.name === name)))];
      nightRef.current = parseNight(wallet && Object.hasOwn(wallet, 'night') ? JSON.stringify(wallet.night) : localStorage.getItem(NIGHT_KEY));
    } catch { /* In-memory play remains available when browser storage is disabled. */ }
    setTickets(balance.current); setCollectedPickups(pickups.current); setWonPrizes(prizes.current); setNight(nightRef.current);
    setRemainingMs(nightRef.current ? timeLeft(nightRef.current, Date.now()) : NIGHT_MS);
    setIsInitialized(true);
    return () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); };
  }, []);

  // Wallet, pickup claims and the run clock share ONE authoritative snapshot.
  const persist = () => {
    try {
      localStorage.setItem(WALLET_KEY, JSON.stringify({ tickets: balance.current, pickups: pickups.current, prizes: prizes.current, night: nightRef.current }));
      localStorage.setItem(STORAGE_KEY, String(balance.current));
      localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(prizes.current));
      localStorage.setItem(NIGHT_KEY, JSON.stringify(nightRef.current));
    } catch { /* Keep the current session playable without storage. */ }
  };
  const notify = (msg: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setLastTransactionMessage(msg);
    noticeTimer.current = setTimeout(() => setLastTransactionMessage(null), 3200);
  };
  const commitBalance = (next: number) => { balance.current = next; persist(); setTickets(next); };
  const playing = () => isInitialized && canEarn(nightRef.current, Date.now());
  const finishNight = (reason: EndReason) => {
    const current = nightRef.current;
    if (!current || current.status !== 'playing') return;
    const count = prizes.current.length;
    const ended = settleNight(current, reason, balance.current, count, Date.now());
    nightRef.current = ended; persist(); setNight(ended); setRemainingMs(0);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setLastTransactionMessage(null);
  };
  const finish = useRef(finishNight); finish.current = finishNight;
  useEffect(() => {
    if (!isInitialized) return;
    const tick = () => {
      const current = nightRef.current;
      if (current?.status !== 'playing') return;
      const left = timeLeft(current, Date.now()); setRemainingMs(left);
      if (!left) finish.current('timeout');
    };
    tick(); const timer = setInterval(tick, 250);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [isInitialized]);

  const startNight = () => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('retro_arcade_previous_night', JSON.stringify({ wallet: localStorage.getItem(WALLET_KEY), prizes: localStorage.getItem(SHELF_STORAGE_KEY) }));
      localStorage.setItem(SHELF_STORAGE_KEY, '[]');
      sessionStorage.removeItem(HALL_POSITION_KEY);
    } catch { /* Fresh state below is still valid for this visit. */ }
    const now = Date.now();
    const fresh: Night = { id: crypto.randomUUID(), startedAt: now, deadline: now + NIGHT_MS, status: 'playing', slotNet: 0 };
    nightRef.current = fresh; balance.current = 0; pickups.current = []; prizes.current = []; nextSpinAt.current = 0;
    persist(); setTickets(0); setCollectedPickups([]); setWonPrizes([]); setNight(fresh); setRemainingMs(NIGHT_MS); setLastTransactionMessage(null);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  };
  const claimLostTickets = (id: PickupId) => {
    if (!playing() || !Object.hasOwn(LOST_TICKETS, id) || pickups.current.includes(id)) return 0;
    const amount = LOST_TICKETS[id].amount;
    if (!Number.isSafeInteger(balance.current + amount)) return 0;
    pickups.current = [...pickups.current, id]; commitBalance(balance.current + amount); setCollectedPickups(pickups.current);
    chipAudio.effect('ticket'); notify('+' + amount + ' Tickets! (A little exploring pays off.)'); return amount;
  };
  const addTickets = (amount: number, reason?: string) => {
    const next = balance.current + amount;
    if (!playing() || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(next)) return;
    commitBalance(next); chipAudio.effect('ticket'); notify('+' + amount + ' Tickets! ' + (reason ? '(' + reason + ')' : ''));
  };
  const spendTickets = (amount: number, reason?: string): boolean => {
    if (!playing() || !Number.isSafeInteger(amount) || amount < 0) return false;
    if (amount === 0) return true;
    if (balance.current < amount) { chipAudio.effect('deny'); notify('Not enough tickets.'); return false; }
    commitBalance(balance.current - amount); chipAudio.effect('prize'); notify('-' + amount + ' Tickets ' + (reason || '')); return true;
  };
  const redeemPrize = (id: string) => {
    const prize = PRIZES.find(p => p.id === id);
    if (!playing() || !prize || prizes.current.includes(prize.name) || balance.current < prize.cost) return false;
    prizes.current = [...prizes.current, prize.name];
    commitBalance(balance.current - prize.cost); setWonPrizes(prizes.current);
    chipAudio.effect('prize'); notify('Redeemed ' + prize.name); return true;
  };
  const spinSlots = (): SpinReceipt | null => {
    if (!playing() || Date.now() < nextSpinAt.current) return null;
    const receipt = settleSpin(balance.current, randomSlotRoll()); if (!receipt) return null;
    nextSpinAt.current = Date.now() + SPIN_MS;
    nightRef.current = { ...nightRef.current!, slotNet: nightRef.current!.slotNet + receipt.net };
    commitBalance(receipt.after); setNight(nightRef.current); return receipt;
  };
  const resetTickets = () => { if (playing()) commitBalance(0); };
  return <TicketContext.Provider value={{ tickets, addTickets, spendTickets, resetTickets, lastTransactionMessage, spinSlots, isInitialized, collectedPickups, claimLostTickets, wonPrizes, redeemPrize, night, remainingMs, startNight, finishNight }}>{children}</TicketContext.Provider>;
}
export function useTickets() {
  const context = useContext(TicketContext);
  if (!context) throw new Error('useTickets must be used within a TicketProvider');
  return context;
}
