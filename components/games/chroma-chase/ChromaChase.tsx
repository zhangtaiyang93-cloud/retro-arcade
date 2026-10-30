'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTickets } from '@/context/TicketContext';
import { SynthAudio } from './audio';
import { GAME, LEVELS, REWARDS } from './config';
import { ChromaChaseGame, Dir, GameEvent, Status } from './engine';
import { ChromaRenderer } from './renderer';
import { claimOnce, createSessionId, rewardsForLevelClear } from './rewards';
import styles from './ChromaChase.module.css';

const FIXED_STEP = 1 / 120;
const HIGH_SCORE_KEY = 'chroma_chase_high_score';
const MUTED_KEY = 'chroma_chase_muted';
const SWIPE_DISTANCE = 18;

const KEY_DIRECTIONS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right'
};

const STATUS_LABELS: Record<Status, string> = {
  title: 'Insert energy',
  ready: 'Get ready',
  playing: 'Chase on',
  paused: 'Paused',
  hit: 'Orb hit',
  levelclear: 'Level clear',
  gameover: 'Game over',
  victory: 'Victory'
};

const CREATURES = [
  { name: 'Lancer', className: styles.lancer, text: 'Pink shard. Hunts you and charges when it sees you down a corridor.' },
  { name: 'Warden', className: styles.warden, text: 'Cyan hexagon. Guards the part of the maze with the most energy left.' },
  { name: 'Glitchling', className: styles.glitchling, text: 'Green pixels. Wanders, flickers, then blinks across the maze.' },
  { name: 'Mirrorcoil', className: styles.mirrorcoil, text: 'Violet spiral. Moves to the opposite side of the maze from you.' }
];

interface Hud {
  status: Status;
  score: number;
  high: number;
  lives: number;
  level: number;
  surge: number;
  countdown: number;
  ticketsLastLevel: number;
  ticketsTotal: number;
}

const INITIAL_HUD: Hud = {
  status: 'title',
  score: 0,
  high: 0,
  lives: GAME.startingLives,
  level: 0,
  surge: 0,
  countdown: 0,
  ticketsLastLevel: 0,
  ticketsTotal: 0
};

const ACTIVE_STATUSES: Status[] = ['ready', 'playing', 'hit', 'levelclear'];

export default function ChromaChase() {
  const { addTickets } = useTickets();
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [firstGame] = useState(() => new ChromaChaseGame());
  const [audio] = useState(() => new SynthAudio());
  const gameRef = useRef<ChromaChaseGame>(firstGame);
  const rendererRef = useRef<ChromaRenderer | null>(null);
  const audioRef = useRef<SynthAudio>(audio);
  const sessionIdRef = useRef<string>('');
  const addTicketsRef = useRef(addTickets);
  const highRef = useRef(0);
  const ticketsRef = useRef({ lastLevel: 0, total: 0 });
  const hudRef = useRef<Hud>(INITIAL_HUD);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const loopsRef = useRef(0);

  useEffect(() => {
    addTicketsRef.current = addTickets;
  }, [addTickets]);

  const saveHighScore = useCallback(() => {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(highRef.current));
    } catch {
      // The high score just won't persist.
    }
  }, []);

  /** Pays out a cleared level. Runs from the game loop's event queue, never during rendering. */
  const awardLevel = useCallback((level: number, noDamage: boolean) => {
    let earned = 0;
    for (const reward of rewardsForLevelClear(sessionIdRef.current, level, noDamage)) {
      if (claimOnce(reward.achievementId)) {
        addTicketsRef.current(reward.amount, reward.reason);
        earned += reward.amount;
      }
    }
    ticketsRef.current = { lastLevel: earned, total: ticketsRef.current.total + earned };
  }, []);

  const handleEvent = useCallback(
    (event: GameEvent) => {
      rendererRef.current?.handleEvent(event);
      switch (event.type) {
        case 'particle':
        case 'core':
        case 'caught':
        case 'hit':
        case 'blink':
        case 'go':
        case 'victory':
          audioRef.current.play(event.type);
          break;
        case 'gameOver':
          audioRef.current.play('gameOver');
          saveHighScore();
          break;
        case 'levelClear':
          awardLevel(event.level, event.noDamage);
          saveHighScore();
          if (event.level < LEVELS.length - 1) audioRef.current.play('levelClear');
          break;
      }
    },
    [awardLevel, saveHighScore]
  );

  const syncHud = useCallback(() => {
    const game = gameRef.current;
    if (game.score > highRef.current) highRef.current = game.score;
    const next: Hud = {
      status: game.status,
      score: game.score,
      high: highRef.current,
      lives: game.lives,
      level: game.level,
      surge: Math.ceil(game.surgeLeft * 10) / 10,
      countdown: game.status === 'ready' ? Math.ceil(game.timer) : 0,
      ticketsLastLevel: ticketsRef.current.lastLevel,
      ticketsTotal: ticketsRef.current.total
    };
    const previous = hudRef.current;
    const changed = (Object.keys(next) as Array<keyof Hud>).some((key) => next[key] !== previous[key]);
    if (changed) {
      hudRef.current = next;
      setHud(next);
    }
  }, []);

  /** Every new game gets a new session, so restarting can't re-trigger a claimed achievement. */
  const beginSession = useCallback(() => {
    audioRef.current.unlock();
    saveHighScore();
    sessionIdRef.current = createSessionId();
    ticketsRef.current = { lastLevel: 0, total: 0 };
    const game = new ChromaChaseGame();
    game.start();
    gameRef.current = game;
    rendererRef.current?.reset();
    syncHud();
    stageRef.current?.focus({ preventScroll: true });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stageRef.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }, [saveHighScore, syncHud]);

  const togglePause = useCallback(() => {
    audioRef.current.unlock();
    gameRef.current.togglePause();
    syncHud();
    stageRef.current?.focus({ preventScroll: true });
  }, [syncHud]);

  const toggleMute = useCallback(() => {
    audioRef.current.unlock();
    setMuted((current) => {
      const next = !current;
      audioRef.current.setMuted(next);
      try {
        localStorage.setItem(MUTED_KEY, next ? '1' : '0');
      } catch {
        // The mute choice just won't persist.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const storedHigh = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10);
      if (storedHigh > 0) highRef.current = storedHigh;
      if (localStorage.getItem(MUTED_KEY) === '1') {
        setMuted(true);
        audioRef.current.setMuted(true);
      }
    } catch {
      // Defaults are fine.
    }
    syncHud();
  }, [syncHud]);

  // The one game loop, plus everything else that has to be released when leaving the page.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const renderer = new ChromaRenderer(canvas);
    rendererRef.current = renderer;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => {
      renderer.reducedMotion = motionQuery.matches;
    };
    applyMotion();
    motionQuery.addEventListener('change', applyMotion);

    const resize = () => {
      renderer.resize(stage.clientWidth, Math.min(window.devicePixelRatio || 1, 2));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    let frameId = 0;
    let last = performance.now();
    let accumulator = 0;
    loopsRef.current++;

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      accumulator += elapsed;
      const game = gameRef.current;
      while (accumulator >= FIXED_STEP) {
        game.step(FIXED_STEP);
        accumulator -= FIXED_STEP;
      }
      for (const event of game.drainEvents()) handleEvent(event);
      renderer.draw(game, elapsed);
      syncHud();
    };
    frameId = requestAnimationFrame(frame);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const game = gameRef.current;
      const active = ACTIVE_STATUSES.includes(game.status);
      const onControl = (event.target as HTMLElement | null)?.closest?.('button, a');
      const direction = KEY_DIRECTIONS[event.key];

      if (direction) {
        if (active) {
          event.preventDefault();
          game.steer(direction);
        }
        return;
      }
      if (event.key === 'm' || event.key === 'M') {
        toggleMute();
      } else if ((event.key === ' ' && !onControl) || event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        if (game.status === 'playing' || game.status === 'ready' || game.status === 'paused') {
          event.preventDefault();
          togglePause();
        } else if (active && event.key === ' ') {
          event.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const pauseIfRunning = () => {
      const game = gameRef.current;
      if (game.status === 'playing' || game.status === 'ready') {
        game.togglePause();
        syncHud();
      }
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfRunning();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pauseIfRunning);
    window.addEventListener('pagehide', saveHighScore);

    const sounds = audioRef.current;

    let debugKey: string | null = null;
    if (process.env.NODE_ENV === 'development') {
      debugKey = '__chromaChaseDebug';
      (window as unknown as Record<string, unknown>)[debugKey] = {
        game: () => gameRef.current,
        session: () => sessionIdRef.current,
        loops: () => loopsRef.current,
        dispatch: handleEvent,
        syncHud
      };
    }

    return () => {
      cancelAnimationFrame(frameId);
      loopsRef.current--;
      observer.disconnect();
      motionQuery.removeEventListener('change', applyMotion);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', pauseIfRunning);
      window.removeEventListener('pagehide', saveHighScore);
      document.removeEventListener('visibilitychange', onVisibility);
      saveHighScore();
      sounds.close();
      rendererRef.current = null;
      if (debugKey) delete (window as unknown as Record<string, unknown>)[debugKey];
    };
  }, [handleEvent, saveHighScore, syncHud, toggleMute, togglePause]);

  const steer = (dir: Dir) => (event: React.PointerEvent) => {
    event.preventDefault();
    audioRef.current.unlock();
    gameRef.current.steer(dir);
  };

  const onStagePointerDown = (event: React.PointerEvent) => {
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };

  const onStagePointerMove = (event: React.PointerEvent) => {
    const start = swipeRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DISTANCE) return;
    gameRef.current.steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };

  const clearSwipe = () => {
    swipeRef.current = null;
  };

  const { status } = hud;
  const canPause = status === 'playing' || status === 'ready' || status === 'paused';
  const gameInProgress = status !== 'title';
  const levelClearTickets = hud.level === 0 ? REWARDS.firstLevelClear : REWARDS.laterLevelClear;

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <Link href="/" className="arcade-btn" style={{ fontSize: '0.7rem', padding: '8px 12px' }}>
          &larr; Floor
        </Link>
        <h2 className={styles.title}>
          <span className={styles.titleKicker}>NEON FEVER</span>
          <span className={styles.titleMain} data-text="CHROMA CHASE">CHROMA CHASE</span>
        </h2>
      </div>

      <div className={styles.layout}>
        <div
          ref={stageRef}
          className={`${styles.stage} ${ACTIVE_STATUSES.includes(status) ? styles.stageActive : ''}`}
          tabIndex={0}
          role="application"
          aria-label="Chroma Chase game. Use the arrow keys or W A S D to steer. Press P to pause."
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={clearSwipe}
          onPointerCancel={clearSwipe}
        >
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

          {status === 'title' && (
            <div className={styles.overlay}>
              <p className={styles.overlayKicker}>{LEVELS.length} levels &bull; {GAME.startingLives} lives</p>
              <p className={styles.overlayLead}>Collect every energy particle. Grab a core to turn the chase around.</p>
              <button type="button" className="arcade-btn arcade-btn-yellow" onClick={beginSession} autoFocus>
                Start game
              </button>
            </div>
          )}

          {status === 'ready' && (
            <div className={`${styles.overlay} ${styles.overlayClear}`} aria-live="polite">
              <p className={styles.countdown} key={hud.countdown}>{hud.countdown}</p>
              <p className={styles.overlayKicker}>Level {hud.level + 1}</p>
            </div>
          )}

          {status === 'paused' && (
            <div className={styles.overlay}>
              <p className={styles.overlayHeading}>Paused</p>
              <button type="button" className="arcade-btn arcade-btn-yellow" onClick={togglePause} autoFocus>
                Resume
              </button>
              <button type="button" className="arcade-btn arcade-btn-pink" onClick={beginSession}>
                Restart
              </button>
            </div>
          )}

          {status === 'levelclear' && (
            <div className={`${styles.overlay} ${styles.overlayClear}`} aria-live="polite">
              <p className={styles.overlayHeading}>Level {hud.level + 1} clear</p>
              <p className={styles.ticketReveal}>+{hud.ticketsLastLevel} 🎟️</p>
              {hud.ticketsLastLevel > levelClearTickets && <p className={styles.overlayLead}>No-damage bonus included</p>}
            </div>
          )}

          {status === 'victory' && (
            <div className={styles.overlay} aria-live="polite">
              <p className={styles.overlayHeading}>Chroma mastered</p>
              <p className={styles.overlayLead}>Score {hud.score.toLocaleString()}</p>
              <p className={styles.ticketReveal}>+{hud.ticketsTotal} 🎟️</p>
              <button type="button" className="arcade-btn arcade-btn-yellow" onClick={beginSession} autoFocus>
                Play again
              </button>
              <Link href="/prizes" className="arcade-btn arcade-btn-pink">Prize shop</Link>
            </div>
          )}

          {status === 'gameover' && (
            <div className={styles.overlay} aria-live="polite">
              <p className={styles.glitch} data-text="SIGNAL LOST">SIGNAL LOST</p>
              <p className={styles.overlayLead}>Score {hud.score.toLocaleString()} &bull; {hud.ticketsTotal} 🎟️ earned</p>
              <button type="button" className="arcade-btn arcade-btn-yellow" onClick={beginSession} autoFocus>
                Try again
              </button>
            </div>
          )}
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}><dt>Score</dt><dd>{hud.score.toLocaleString()}</dd></div>
          <div className={styles.stat}><dt>High score</dt><dd>{hud.high.toLocaleString()}</dd></div>
          <div className={styles.stat}><dt>Lives</dt><dd aria-label={`${hud.lives} lives`}>{'◆'.repeat(Math.max(0, hud.lives)) || '–'}</dd></div>
          <div className={styles.stat}><dt>Level</dt><dd>{hud.level + 1}/{LEVELS.length}</dd></div>
          <div className={styles.stat}><dt>Status</dt><dd className={styles.statusText}>{STATUS_LABELS[status]}</dd></div>
          <div className={styles.stat}><dt>Surge</dt><dd>{hud.surge > 0 ? `${hud.surge.toFixed(1)}s` : '–'}</dd></div>
        </dl>

        <div className={styles.controls}>
          <button type="button" className={styles.control} onClick={togglePause} disabled={!canPause}>
            {status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className={styles.control} onClick={toggleMute} aria-pressed={muted}>
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          <button type="button" className={styles.control} onClick={beginSession} disabled={!gameInProgress}>
            Restart
          </button>
        </div>

        <div className={styles.dpad} role="group" aria-label="Touch steering">
          <button type="button" className={`${styles.dpadButton} ${styles.dpadUp}`} onPointerDown={steer('up')} aria-label="Steer up">▲</button>
          <button type="button" className={`${styles.dpadButton} ${styles.dpadLeft}`} onPointerDown={steer('left')} aria-label="Steer left">◀</button>
          <button type="button" className={`${styles.dpadButton} ${styles.dpadRight}`} onPointerDown={steer('right')} aria-label="Steer right">▶</button>
          <button type="button" className={`${styles.dpadButton} ${styles.dpadDown}`} onPointerDown={steer('down')} aria-label="Steer down">▼</button>
        </div>

        <section className={styles.legend}>
          <h3 className={styles.legendTitle}>The creatures</h3>
          <ul>
            {CREATURES.map((creature) => (
              <li key={creature.name}>
                <span className={`${styles.swatch} ${creature.className}`} aria-hidden="true" />
                <span><strong>{creature.name}.</strong> {creature.text}</span>
              </li>
            ))}
          </ul>
          <p className={styles.keys}>Arrows or WASD steer. P pauses. M mutes.</p>
        </section>
      </div>
    </div>
  );
}
