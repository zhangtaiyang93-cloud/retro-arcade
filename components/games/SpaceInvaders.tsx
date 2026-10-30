'use client';

import { useEffect, useRef, useState } from 'react';
import { useTickets } from '@/context/TicketContext';
import { createGame, stepGame, WIDTH, HEIGHT, type GameState } from '@/lib/space-invaders';
import styles from './SpaceInvaders.module.css';

const SPRITE = ['00100100', '00011000', '00111100', '01111110', '11011011', '11111111', '10100101', '00100100'];
function draw(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = '#060b19'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 64; i++) {
    ctx.fillStyle = i % 3 ? '#304465' : '#6985a6';
    ctx.fillRect((i * 137) % WIDTH, (i * 79) % HEIGHT, 2, 2);
  }
  ctx.strokeStyle = '#00ffcc33'; ctx.beginPath(); ctx.moveTo(0, 422); ctx.lineTo(WIDTH, 422); ctx.stroke();
  for (const alien of g.aliens) {
    ctx.fillStyle = ['#ff65b8', '#ffe66d', '#00ffcc'][alien.row];
    SPRITE.forEach((row, y) => [...row].forEach((pixel, x) => {
      if (pixel === '1') ctx.fillRect(Math.round(alien.x - 16 + x * 4), Math.round(alien.y - 16 + y * 4), 4, 4);
    }));
  }
  if (g.invincible <= 0 || Math.floor(g.invincible * 10) % 2 === 0) {
    ctx.fillStyle = '#00ffcc'; ctx.fillRect(g.player - 18, 398, 36, 12);
    ctx.fillRect(g.player - 10, 392, 20, 8); ctx.fillRect(g.player - 3, 384, 6, 14);
  }
  ctx.fillStyle = '#eaffff'; for (const s of g.shots) ctx.fillRect(s.x - 2, s.y - 8, 4, 14);
  ctx.fillStyle = '#ff5385'; for (const b of g.bombs) ctx.fillRect(b.x - 3, b.y, 6, 13);
}
export default function SpaceInvaders() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef(createGame());
  const input = useRef({ left: false, right: false, fire: false });
  const { addTickets } = useTickets();
  const award = useRef(addTickets);
  const [hud, setHud] = useState({ phase: game.current.phase, score: 0, lives: 3, wave: 1, earned: 0 });
  useEffect(() => { award.current = addTickets; }, [addTickets]);
  const clearInput = () => { input.current = { left: false, right: false, fire: false }; };
  const publish = () => {
    const { phase, score, lives, wave, earned } = game.current;
    setHud(old => old.phase === phase && old.score === score && old.lives === lives && old.wave === wave && old.earned === earned ? old : { phase, score, lives, wave, earned });
  };
  const start = () => {
    game.current = createGame(); game.current.phase = 'playing'; clearInput(); publish(); canvas.current?.focus();
  };
  const pause = () => {
    if (game.current.phase === 'playing') game.current.phase = 'paused';
    else if (game.current.phase === 'paused') game.current.phase = 'playing';
    clearInput(); publish();
  };
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const tick = (now: number) => {
      const reward = stepGame(game.current, last ? (now - last) / 1000 : 0, input.current);
      last = now;
      if (reward) award.current(reward, `Space Invaders wave cleared`);
      draw(ctx, game.current); publish(); frame = requestAnimationFrame(tick);
    };
    const suspend = () => {
      clearInput();
      if (game.current.phase === 'playing') { game.current.phase = 'paused'; publish(); }
    };
    window.addEventListener('blur', suspend);
    const visibility = () => { if (document.hidden) suspend(); };
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('blur', suspend); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return (
    <section className={styles.game} aria-label="Space Invaders game">
      <div className={styles.hud} aria-live="polite">
        <span>SCORE {String(hud.score).padStart(5, '0')}</span><span>WAVE {hud.wave}/3</span><span>LIVES {hud.lives}</span><span>+{hud.earned} TICKETS</span>
      </div>
      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} width={WIDTH} height={HEIGHT} tabIndex={0}
          aria-label="Space Invaders playfield. Left and right arrows or A and D to move, Space to shoot, P to pause."
          onBlur={clearInput}
          onKeyDown={e => {
            const key = e.key.toLowerCase();
            if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'p', 'escape'].includes(key)) e.preventDefault();
            if ((key === 'p' || key === 'escape') && !e.repeat) { pause(); return; }
            if (key === 'arrowleft' || key === 'a') input.current.left = true;
            if (key === 'arrowright' || key === 'd') input.current.right = true;
            if (key === ' ') input.current.fire = true;
          }}
          onKeyUp={e => {
            const key = e.key.toLowerCase();
            if (key === 'arrowleft' || key === 'a') input.current.left = false;
            if (key === 'arrowright' || key === 'd') input.current.right = false;
            if (key === ' ') { e.preventDefault(); input.current.fire = false; }
          }}>Use a browser with Canvas support to play Space Invaders.</canvas>
        {hud.phase !== 'playing' && <div className={styles.overlay}>
          <h3 className="pixel-text">{hud.phase === 'ready' ? 'DEFEND THE EARTH' : hud.phase === 'paused' ? 'PAUSED' : hud.phase === 'won' ? 'EARTH IS SAFE!' : 'GAME OVER'}</h3>
          <p>{hud.phase === 'ready' ? 'Clear 3 waves. Dodge enemy fire. Earn 10 / 20 / 30 tickets per wave.' : hud.phase === 'paused' ? 'Take a breath. Your mission is waiting.' : `Score ${hud.score} · ${hud.earned} tickets added to your wallet.`}</p>
          <button className="arcade-btn arcade-btn-yellow" onClick={hud.phase === 'paused' ? () => { pause(); canvas.current?.focus(); } : start}>
            {hud.phase === 'ready' ? 'START MISSION' : hud.phase === 'paused' ? 'RESUME' : 'PLAY AGAIN'}
          </button>
        </div>}
      </div>
      <div className={styles.controls}>
        {(['left', 'fire', 'right'] as const).map(action => <button key={action} className="arcade-btn" aria-label={action === 'fire' ? 'Fire laser' : `Move ${action}`}
          onPointerDown={e => { if (game.current.phase !== 'playing') return; e.currentTarget.setPointerCapture(e.pointerId); input.current[action] = true; }}
          onPointerUp={() => { input.current[action] = false; }} onPointerCancel={() => { input.current[action] = false; }} onLostPointerCapture={() => { input.current[action] = false; }}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); input.current[action] = true; } }}
          onKeyUp={() => { input.current[action] = false; }} onBlur={() => { input.current[action] = false; }}
        >{action === 'left' ? '←' : action === 'right' ? '→' : 'FIRE'}</button>)}
        <button className="arcade-btn" onClick={() => { pause(); canvas.current?.focus(); }} disabled={hud.phase !== 'playing' && hud.phase !== 'paused'}>{hud.phase === 'paused' ? 'RESUME' : 'PAUSE'}</button>
      </div>
      <p className={styles.help}>← → / A D move · Hold SPACE to fire · P pauses · Touch controls below</p>
    </section>
  );
}
