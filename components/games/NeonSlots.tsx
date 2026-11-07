'use client';
import { effectsEnabled } from '@/lib/chip-audio';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useTickets } from '@/context/TicketContext';
import { SLOT_OUTCOMES, SPIN_COST, SPIN_MS, type SlotSymbol, type SpinReceipt } from '@/lib/slots';
import styles from './NeonSlots.module.css';

const reelSymbols: SlotSymbol[] = ['CHERRY', 'BAR', 'STAR', '7'];
function Symbol({ value }: { value: SlotSymbol }) {
  if (value === 'CHERRY') return <svg className={styles.cherry} viewBox="0 0 80 80" aria-hidden="true"><path d="M27 47 44 17 57 48M44 17Q62 10 66 24Q52 30 44 17" fill="none" stroke="#39ff14" strokeWidth="5" strokeLinejoin="round"/><path d="M13 46h22v7h6v19H13V60H7V53h6zm35 4h20v7h6v19H48V65h-6V57h6z" fill="#ff247c"/><path d="M17 50h9v6h-9zm34 5h8v6h-8z" fill="#ffb4d0"/></svg>;
  return <span className={value === '7' ? styles.seven : value === 'BAR' ? styles.bar : styles.star}>{value === 'STAR' ? '★' : value}</span>;
}

export default function NeonSlots() {
  const { tickets, spinSlots, isInitialized } = useTickets();
  const [receipt, setReceipt] = useState<SpinReceipt | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<SlotSymbol[]>(['7', '7', '7']);
  const [stopped, setStopped] = useState(3);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const mutedRef = useRef(true);
  const reduced = useRef(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = query.matches; };
    update(); query.addEventListener('change', update);
    return () => {
      query.removeEventListener('change', update);
      timers.current.forEach(clearTimeout);
      if (ticker.current) clearInterval(ticker.current);
      void audio.current?.close().catch(() => {});
    };
  }, []);

  const tone = (frequency: number, length = 0.07) => {
    if (mutedRef.current || !effectsEnabled()) return;
    try {
      const ctx = audio.current ?? (audio.current = new AudioContext());
      void ctx.resume().catch(() => {});
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + length);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(); oscillator.stop(ctx.currentTime + length);
    } catch { /* Audio is optional. */ }
  };

  const spin = () => {
    if (lock.current || !isInitialized || tickets < SPIN_COST) return;
    lock.current = true;
    setError('');
    let next: SpinReceipt | null;
    try { next = spinSlots(); } catch {
      lock.current = false; setError('Machine unavailable. No tickets spent. Please try again.'); return;
    }
    if (!next) { lock.current = false; setError('Please wait for the machine, or check your balance.'); return; }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setReceipt(next); setSpinning(true); setStopped(0);
    tone(180, 0.15);
    const startedAt = performance.now();
    const stops = [1050, 1650, SPIN_MS];
    ticker.current = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setReels(next.outcome.symbols.map((symbol, index) =>
        elapsed >= stops[index] ? symbol :
          reduced.current ? 'BAR' : reelSymbols[(Math.floor(elapsed / 85) + index) % reelSymbols.length]
      ));
      setStopped(stops.filter(time => elapsed >= time).length);
    }, 85);
    [1050, 1650].forEach((time, index) => {
      timers.current.push(setTimeout(() => tone(330 + index * 110), time));
    });
    timers.current.push(setTimeout(() => {
      if (ticker.current) clearInterval(ticker.current);
      ticker.current = null;
      setReels([...next.outcome.symbols]); setStopped(3); setSpinning(false); lock.current = false;
      tone(next.net > 0 ? 880 : next.net === 0 ? 440 : 120, 0.2);
      if (next.net > 0 && !reduced.current) {
        confetti({ particleCount: next.outcome.id === 'jackpot' ? 160 : 45, spread: 75, origin: { y: 0.55 }, disableForReducedMotion: true });
      }
    }, SPIN_MS));
  };

  const insufficient = tickets < SPIN_COST;
  const disabled = spinning || !isInitialized || insufficient;
  const payout = receipt?.outcome.payout ?? 0;
  const displayBalance = spinning && receipt ? receipt.before - SPIN_COST : tickets;
  const resultTitle = spinning ? 'REELS IN MOTION' : receipt ? receipt.outcome.label : 'YOUR NEXT SPIN?';
  const resultText = spinning ? 'Three reels. One result.' : receipt
    ? receipt.net > 0 ? '+' + receipt.net.toLocaleString('en-US') + ' net tickets. Your return is in the wallet.'
      : receipt.net === 0 ? '50 tickets returned. You broke even.'
      : 'No tickets returned. This spin cost 50 tickets.'
    : 'Spend 50 tickets. Match the payline. Chase the neon jackpot.';

  return <div className={styles.game}>
    <div className={styles.topline}><span>ONE PAYLINE · 50 TICKETS / SPIN</span><button className={styles.sound} aria-pressed={!muted} aria-label={muted ? 'Enable slot sound' : 'Mute slot sound'} onClick={() => { mutedRef.current = !muted; setMuted(!muted); }}>SOUND {muted ? 'OFF' : 'ON'}</button></div>
    <div className={styles.jackpot}><span>★ NEON JACKPOT ★</span><strong>10,000</strong><span>TICKETS · TRIPLE SEVENS</span></div>
    <div className={styles.machine} aria-label="Slot machine reels" aria-busy={spinning}>
      <div className={styles.paylineLabel}>PAYLINE</div>
      <div className={styles.reels} aria-hidden="true">
        {reels.map((symbol, index) => <div key={index} className={styles.reel + ' ' + (spinning && stopped <= index ? styles.rolling : '')}><Symbol value={symbol}/><span className={styles.reelIndex}>0{index + 1}</span></div>)}
      </div>
      <div className={styles.result} role="status" aria-live="polite" aria-atomic="true">
        <h3 className={receipt && receipt.net > 0 && !spinning ? styles.win : ''}>{resultTitle}</h3>
        <p>{resultText}</p>
      </div>
    </div>
    <div className={styles.meters}>
      <div><span>YOUR WALLET</span><strong>{displayBalance.toLocaleString('en-US')} <small>🎟️</small></strong></div>
      <div><span>SPIN COST</span><strong>50 <small>🎟️</small></strong></div>
      <div><span>LAST RETURN</span><strong>{spinning ? '···' : receipt ? payout.toLocaleString('en-US') : '—'} <small>🎟️</small></strong></div>
    </div>
    <button type="button" className={'arcade-btn arcade-btn-yellow ' + styles.spin} disabled={disabled} onClick={spin}>
      {!isInitialized ? 'LOADING WALLET…' : spinning ? 'SPINNING…' : insufficient ? 'NEED 50 TICKETS' : 'SPIN · 50 TICKETS'}
    </button>
    <div className={styles.hint}>
      {!spinning && insufficient ? <><span>You need {SPIN_COST - tickets} more tickets.</span> <Link href="/">Play a free game →</Link></> : <span>Returns include your stake. A miss returns 0. No spin limit.</span>}
      {error && <p role="alert">{error}</p>}
    </div>
    <details className={styles.odds}>
      <summary>PAYTABLE &amp; EXACT ODDS <span>VIEW ↓</span></summary>
      <div className={styles.tableWrap}><table><caption>One outcome per spin. Returns include the 50-ticket stake.</caption><thead><tr><th scope="col">RESULT</th><th scope="col">RETURN</th><th scope="col">CHANCE</th></tr></thead><tbody>
        {[...SLOT_OUTCOMES].reverse().map(outcome => <tr key={outcome.id}><th scope="row">{outcome.label}</th><td>{outcome.payout.toLocaleString('en-US')} 🎟️</td><td>{outcome.weight / 100}%</td></tr>)}
      </tbody></table></div>
      <p>95% average return: 47.5 tickets per 50-ticket spin over many plays, not a promise for a session. Each spin is independent. Jackpot: 1 in 2,000. In-game tickets only.</p>
    </details>
    <div className={styles.footer}>EST. AFTER HOURS <span>✦</span> NEON LUCK CABINET <span>✦</span> GOOD LUCK, PLAYER</div>
  </div>;
}
