'use client';

import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTickets } from '@/context/TicketContext';
import { formatClock, OWNER_TICKETS, type NightResult } from '@/lib/night';
import { chipAudio, SOUND_KEY, type MusicCue } from '@/lib/chip-audio';
import MusicCredit from './MusicCredit';
import './night-story.css';

const intro = [
  ['23:30 · ONE LAST CUSTOMER', 'Half an hour left.', 'You push open the arcade door. The owner already has his closing keys out.', 'OWNER: Midnight. That is all the time you have.'],
  ['EMPTY POCKETS · BIG PLANS', 'Empty pockets. No problem.', 'Five cabinets are free to play. Earn tickets, then trade them for prizes.', 'NEON LUCK costs 50 tickets a spin. Win big, or lose your last ticket.'],
  ['SIX PRIZES · ONE NIGHT', 'That whole shelf is coming home.', 'Six prizes. 935 tickets. Check forgotten corners for a little extra luck.', 'YOU: Every last one. OWNER: ...You are serious?'],
  ['BEFORE CLOSING', 'Get every prize. Then get out.', 'Collect all six prizes and leave through the EXIT before your 30 minutes run out.', 'The clock starts when you enter. Games, shopping and background tabs all count.'],
];
function endingScript(result: NightResult) {
  if (result.ending === 'owner') return [
    ['SECRET ENDING · JACKPOT', 'This is bigger than the prize shelf.', `${result.tickets.toLocaleString()} tickets cover the counter. At least ten times the price of every prize.`, 'The slot machine is still ringing. The owner is doing the math.'],
    ['THE HOUSE CHANGES HANDS', 'The owner slides over the keys.', 'OWNER: Take the prizes. Actually... take the whole arcade.', 'You take the keys. He takes off his name badge. Finally, an early night.'],
    ['UNDER NEW MANAGEMENT', 'Jackpot legend. Opening shift tomorrow.', 'You won the entire arcade. Keys in hand, you step into the night.', 'The sign changes: NEW OWNER. Tonight, you are the house.'],
  ];
  if (result.ending === 'complete') return [
    ['SIX OUT OF SIX', 'You actually cleared the shelf.', 'Stickers, a keychain, an alien, shades, a handheld and the biggest trophy.', 'OWNER: You said every last one. You really meant it.'],
    ['LAST BAG OUT', 'Last customer. Biggest bag.', 'You squeeze all six prizes into your arms and slip out before the shutter falls.', 'The neon flickers twice behind you. Close enough to applause.'],
    ['MISSION COMPLETE', 'Now that was a good night.', 'Half an hour. Empty hands in. An armful of prizes out.', 'The owner flips the sign. You are already finding a spot for that trophy.'],
  ];
  const expired = result.reason === 'timeout';
  return [
    [expired ? '00:00 · CLOSING TIME' : 'CALLING IT A NIGHT', expired ? 'Midnight.' : 'Calling it a night.', expired ? 'One last bell. The cabinets stop taking players. The owner reaches for the shutter.' : 'You glance at the prizes still on the shelf and decide to head home.', result.prizes === 6 ? 'All six prizes are yours, but you missed your chance to leave before closing.' : `You take home ${result.prizes} / 6 prizes. The rest stay behind the counter.`],
    ['SEE YOU NEXT TIME', result.prizes ? 'At least the bag is not empty.' : 'Luck has clocked out.', result.prizes ? 'You carry your prizes outside. The missing ones can wait for another night.' : 'You turn out your empty pockets, shrug and step into the night.', 'OWNER: Same time tomorrow. YOU: Save me that trophy.'],
    ['ANOTHER NIGHT, ANOTHER TRY', 'Another night. Another shot.', 'The neon goes dark. Tomorrow, this corner will light up again.', 'A new night starts at zero. The prize shelf and hidden tickets reset too.'],
  ];
}
const prizeGlyphs = ['👾', '🔑', '🛸', '🕶', '▣', '★'];
function StoryArt({ kind, beat, prizes = 6, expired = false }: { kind: 'intro' | NightResult['ending']; beat: number; prizes?: number; expired?: boolean }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const t = setInterval(() => setFrame(f => (f + 1) % 8), 100); return () => clearInterval(t); }, []);
  const walks = (kind === 'intro' && beat === 0) || (kind === 'owner' ? beat === 2 : kind !== 'intro' && beat === 1);
  return <div className={`story-art art-${kind} art-beat-${beat}`} aria-hidden="true">
    <div className="story-painted-hall" />
    <div className="story-night-wash" />
    <div className="story-digital-clock">{kind === 'intro' ? beat === 3 ? '30:00' : '23:30' : expired ? '00:00' : 'LAST CALL'}</div>
    {kind === 'intro' && beat === 1 && <div className="story-empty-wallet"><span>YOUR POCKET</span><strong>0</strong><small>TICKETS</small></div>}
    {((kind === 'intro' && beat === 2) || ((kind === 'complete' || kind === 'closing') && beat === 0)) && <div className="story-prize-line">{prizeGlyphs.map((glyph, i) => <span key={i} className={i < prizes ? 'is-won' : 'is-missing'} style={{ '--i': i } as CSSProperties}>{glyph}<small>{i + 1}/6</small></span>)}</div>}
    <div className={`story-actor ${walks ? 'actor-walks' : ''}`}>
      {walks ? <div className="story-walk-sprite" style={{ backgroundPosition: `${frame % 4 * 100 / 3}% ${Math.floor(frame / 4) * 100}%` }} /> : <img src="/art/streetwear-idle.png" alt="" />}
      {kind === 'complete' && <div className="story-prize-bag">★<small>6/6</small></div>}
      {kind === 'closing' && prizes > 0 && <div className="story-prize-bag small-bag">★<small>{prizes}/6</small></div>}
    </div>
    {kind === 'owner' && <>{beat === 0 && <div className="story-jackpot">7 · 7 · 7</div>}{beat === 1 && <><div className="story-boss-line">ALL YOURS.</div><svg className="story-owner-key" viewBox="0 0 40 20" shapeRendering="crispEdges"><path d="M3 2H15V5H18V8H38V13H35V18H30V13H27V18H22V13H18V16H15V19H3V16H0V5H3Z" fill="#966038"/><path d="M4 0H14V3H17V7H37V11H34V16H30V11H26V16H22V11H17V14H14V17H4V14H1V3H4Z" fill="#ffe680"/><path d="M6 4H12V13H6Z" fill="#503844"/></svg></>}{beat >= 2 && <div className="story-new-owner">NEW OWNER</div>}{beat < 2 && <div className="story-ticket-rain">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties}>★</i>)}</div>}</>}
    {kind !== 'intro' && beat === 2 && <div className="story-shutter"><span>{kind === 'owner' ? 'UNDER NEW MANAGEMENT' : 'CLOSED · SEE YOU TOMORROW'}</span></div>}
    {kind === 'intro' && beat === 3 && <div className="story-objective"><b>6 PRIZES</b><span>+</span><b>30 MINUTES</b><span>→</span><b>EXIT</b></div>}
    <div className="story-grain" />
  </div>;
}
function Film({ result, onDone, music, effects, onMusic, onEffects, onGesture, preview = false }: { result?: NightResult; onDone: () => void; music: boolean; effects: boolean; onMusic: () => void; onEffects: () => void; onGesture: () => void; preview?: boolean }) {
  const [beat, setBeat] = useState(0);
  const script = result ? endingScript(result) : intro;
  const summary = !!result && beat === 3;
  const line = script[Math.min(beat, script.length - 1)];
  useEffect(() => {
    if (beat >= 3) return;
    const timer = setTimeout(() => setBeat(b => b + 1), 8500);
    return () => clearTimeout(timer);
  }, [beat]);
  useEffect(() => { chipAudio.effect(beat === 0 ? 'door' : result?.ending === 'owner' ? 'key' : beat === 2 && result ? 'shutter' : 'clock'); }, [beat, result?.ending]);
  return <section className="night-film" aria-label={result ? 'Ending animation' : 'Opening animation'} onPointerDownCapture={onGesture} onKeyDownCapture={onGesture}>
    <div className="story-topline"><span>BEFORE CLOSING / {result ? 'FINAL REEL' : 'OPENING REEL'}</span><div><button onClick={onMusic}>MUSIC {music ? 'ON' : 'OFF'}</button><button onClick={onEffects}>SFX {effects ? 'ON' : 'OFF'}</button><button onClick={() => setBeat(3)}>{result ? 'NIGHT REPORT' : 'SKIP INTRO'}</button></div></div>
    <div className={`story-screen ${summary ? 'story-summary' : ''}`} key={summary ? 'summary' : beat}>
      <StoryArt kind={result?.ending || 'intro'} beat={Math.min(beat, result ? 2 : 3)} prizes={result?.ending === 'owner' ? 6 : result?.prizes ?? 6} expired={result?.reason === 'timeout'} />
      <div className="story-subtitles" aria-live="polite"><p className="story-kicker">{summary ? 'NIGHT REPORT' : line[0]}</p><h1>{summary ? result.ending === 'owner' ? 'SECRET ENDING · JACKPOT LEGEND' : result.ending === 'complete' ? 'ENDING · CLEAN SWEEP' : 'ENDING · NEXT TIME' : line[1]}</h1><p>{summary ? `Prizes ${result.prizes}/6 · Tickets ${result.tickets.toLocaleString()} · Time ${formatClock(result.elapsedMs)}` : line[2]}</p><p className="story-dialogue">{summary ? result.ending === 'owner' ? 'The arcade keys are yours. Tomorrow, you open the doors.' : 'Night saved. A new run resets your tickets, prizes and hidden pickups.' : line[3]}</p></div>
    </div>
    <MusicCredit />
    <div className="story-bottomline"><div className="story-beats">{[0,1,2,3].map(i => <i key={i} className={i === beat ? 'active' : i < beat ? 'done' : ''} />)}</div><span>{Math.min(beat + 1,4)} / 4</span><button className="arcade-btn arcade-btn-yellow" onClick={() => { chipAudio.effect('ui'); if (beat === 3) onDone(); else setBeat(b => b + 1); }}>{beat === 3 ? preview ? 'BACK TO SCREENINGS' : result ? 'ONE MORE NIGHT' : 'ENTER ARCADE · START 30:00' : 'NEXT SCENE →'}</button></div>
  </section>;
}
export default function NightExperience({ children }: { children: ReactNode }) {
  const { night, isInitialized, remainingMs, startNight, finishNight, tickets } = useTickets();
  const [introPlaying, setIntroPlaying] = useState(false);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [music, setMusic] = useState(true);
  const [effects, setEffects] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [preview, setPreview] = useState<'intro' | NightResult['ending'] | null>(null);
  const pathname = usePathname(); const router = useRouter();
  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(SOUND_KEY) || '{}'); setMusic(stored.music !== false); setEffects(stored.effects !== false); } catch { /* Defaults. */ }
    const leave = () => setExitPrompt(true); window.addEventListener('arcade:exit', leave);
    return () => { window.removeEventListener('arcade:exit', leave); chipAudio.suspend(); };
  }, []);
  useEffect(() => { chipAudio.settings(music,effects); try { localStorage.setItem(SOUND_KEY,JSON.stringify({ music,effects })); } catch { /* Optional preference. */ } }, [music,effects]);
  const cue: MusicCue = pathname === '/storyboard' ? preview || 'intro' : introPlaying || !night ? 'intro' : night.status === 'ended' ? night.result!.ending : pathname.startsWith('/games/') ? 'game' : 'hall';
  useEffect(() => { chipAudio.play(cue); }, [cue]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) chipAudio.suspend(); else if (audioReady) void chipAudio.unlock(); };
    document.addEventListener('visibilitychange',visibility); return () => document.removeEventListener('visibilitychange',visibility);
  }, [audioReady]);
  useEffect(() => { if (remainingMs > 0 && remainingMs <= 60000 && Math.ceil(remainingMs / 1000) % 10 === 0) chipAudio.effect('clock'); }, [Math.ceil(remainingMs / 1000)]);
  const unlock = () => { void chipAudio.unlock(); setAudioReady(true); };
  const toggleMusic = () => { unlock(); setMusic(v=>!v); };
  const toggleEffects = () => { unlock(); setEffects(v=>!v); };
  if (!isInitialized) return <div className="night-loading pixel-text">WARMING UP THE TUBES…</div>;
  const beginIntro = () => { unlock(); chipAudio.play('intro'); chipAudio.effect('door'); setIntroPlaying(true); setExitPrompt(false); };
  const soundProps = { music, effects, onMusic: toggleMusic, onEffects: toggleEffects, onGesture: () => { if (!audioReady) unlock(); } };
  if (pathname === '/storyboard') {
    const demo: NightResult | undefined = preview && preview !== 'intro' ? { ending: preview, reason: preview === 'closing' ? 'timeout' : 'exit', tickets: preview === 'owner' ? 10000 : 42, prizes: preview === 'complete' ? 6 : 3, slotNet: preview === 'owner' ? 9950 : 0, elapsedMs: preview === 'closing' ? 1800000 : 1285000 } : undefined;
    if (preview) return <Film key={preview} preview result={demo} {...soundProps} onDone={() => setPreview(null)} />;
    return <section className="night-title"><div className="title-art" /><div className="title-vignette" /><div className="title-copy"><p className="story-kicker">DIRECTOR'S SCREENING ROOM</p><h1 className="pixel-text" style={{ fontSize: 'clamp(1.3rem,4vw,3rem)' }}>SCREENING ROOM</h1><p>Preview all four films without changing your tickets or prizes. An active game clock keeps running.</p><div className="story-preview-buttons">{([['intro','OPENING · BEFORE CLOSING'],['complete','ENDING · CLEAN SWEEP'],['closing','ENDING · NEXT TIME'],['owner','SECRET ENDING · JACKPOT LEGEND']] as const).map(([key,label]) => <button className="arcade-btn arcade-btn-yellow" key={key} onClick={() => { unlock(); setPreview(key); }}>{label}</button>)}<button className="arcade-btn" onClick={() => router.push('/')}>BACK TO GAME</button></div></div></section>;
  }
  if (introPlaying) return <Film {...soundProps} onDone={() => { startNight(); setIntroPlaying(false); router.replace('/'); }} />;
  if (!night) return <section className="night-title">
    <div className="title-art" /><div className="title-vignette" />
    <div className="title-copy"><p className="story-kicker">A HALF-HOUR ARCADE STORY</p><h1 className="pixel-text">BEFORE<br /><em>CLOSING</em></h1><h2>ONE LAST NIGHT</h2><p>Walk in empty-handed. Take the whole prize shelf home.</p><button className="arcade-btn arcade-btn-yellow" onClick={beginIntro}>START A NEW NIGHT</button><small>30 MINUTES / SIX PRIZES / START WITH 0 TICKETS</small><div className="title-audio"><button onClick={toggleMusic}>MUSIC {music ? 'ON' : 'OFF'}</button><button onClick={toggleEffects}>SFX {effects ? 'ON' : 'OFF'}</button></div></div>
    <img className="title-hero" src="/art/streetwear-idle.png" alt="A streetwear-clad player outside the neon arcade" /><div className="title-credit">A RETRO ARCADE STORY · RUBY PANN<MusicCredit /></div>
  </section>;
  if (night.status === 'ended') return <Film key={night.id} result={night.result} {...soundProps} onDone={beginIntro} />;
  return <div className="night-game" onPointerDownCapture={() => { if (!audioReady) unlock(); }}>
    <div className={`night-status ${remainingMs <= 60000 ? 'last-minute' : ''}`}><div><span>CLOSES IN</span><strong className="pixel-text" role="timer" aria-label={`CLOSES IN ${formatClock(remainingMs)}`}>{formatClock(remainingMs)}</strong></div><span className="night-status-goal">{tickets >= OWNER_TICKETS && night.slotNet > 0 ? 'The owner is eyeing your ticket pile. Try the exit.' : 'Collect all 6 prizes. Leave before closing.'}</span><div><button onClick={toggleMusic}>♫ {music ? 'ON' : 'OFF'}</button><button onClick={toggleEffects}>SFX {effects ? 'ON' : 'OFF'}</button><button onClick={() => setExitPrompt(true)}>EXIT</button></div></div>
    <div key={night.id} inert={exitPrompt}>{children}</div>
    {exitPrompt && <div className="night-exit-backdrop" role="dialog" aria-modal="true" aria-label="Leave the arcade" onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') setExitPrompt(false);
      if (event.key === 'Tab') { const buttons = event.currentTarget.querySelectorAll('button'); const first = buttons[0], last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    }}><div className="night-exit-card"><p className="story-kicker">LAST BAG OUT</p><h2>Ready to call it a night?</h2><p>Leaving ends this run. Collect all six prizes to complete the challenge.</p>{pathname.startsWith('/games/') && <p>Unbanked tickets from the current game will not carry over.</p>}<p className="night-exit-time">Time left {formatClock(remainingMs)}</p><div><button className="arcade-btn" autoFocus onClick={() => setExitPrompt(false)}>KEEP PLAYING</button><button className="arcade-btn arcade-btn-yellow" onClick={() => { unlock(); chipAudio.effect('door'); setExitPrompt(false); finishNight('exit'); }}>LEAVE AND FINISH</button></div></div></div>}
  </div>;
}
