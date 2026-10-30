'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTickets } from '@/context/TicketContext';
import confetti from 'canvas-confetti';

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  alpha: number;
  vy: number;
  color: string;
}

const GRID_SIZE = 22; // 22 x 22 grid
const CELL_SIZE = 20; // 440 x 440 px canvas

export default function NeonSnake() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { tickets, addTickets } = useTickets();

  // State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [foodCount, setFoodCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [earnedTicketsThisRound, setEarnedTicketsThisRound] = useState<number>(0);

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Guard against double awarding tickets
  const hasAwardedTicketsRef = useRef<boolean>(false);

  // Screen shake
  const screenShakeRef = useRef<number>(0);

  // Web Audio synthesizer
  const playSound = useCallback((type: 'eat' | 'bonus' | 'die' | 'ticket') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'eat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'bonus') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(987.77, now + 0.07);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'ticket') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // AudioContext unavailable
    }
  }, [isMuted]);

  // Load high score
  useEffect(() => {
    try {
      const stored = localStorage.getItem('retro_arcade_snake_highscore');
      if (stored) setHighScore(parseInt(stored, 10) || 0);
    } catch {
      // ignore
    }
  }, []);

  // Engine state refs
  const engineRef = useRef({
    snake: [
      { x: 10, y: 11 },
      { x: 9, y: 11 },
      { x: 8, y: 11 }
    ] as Point[],
    dir: { x: 1, y: 0 } as Point,
    nextDir: { x: 1, y: 0 } as Point,
    food: { x: 16, y: 11 } as Point,
    bonusFood: null as (Point & { timer: number }) | null,
    score: 0,
    foodsEaten: 0,
    speedMs: 115,
    lastTick: 0,
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    running: false
  });

  // Spawn random food
  const spawnFood = (snake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const hit = snake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
      if (!hit) break;
    }
    return newFood;
  };

  // Finalize tickets on game over
  const finalizeTickets = useCallback((finalScore: number, finalFoods: number) => {
    if (hasAwardedTicketsRef.current) return;
    hasAwardedTicketsRef.current = true;

    // 1 ticket per 3 food eaten + 1 ticket per 80 score
    const won = Math.max(5, Math.floor(finalFoods / 3) + Math.floor(finalScore / 80));
    setEarnedTicketsThisRound(won);
    addTickets(won, 'Cyber Neon Snake Game');
    playSound('ticket');

    if (won >= 15) {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [addTickets, playSound]);

  // Start / Restart game
  const startGame = useCallback(() => {
    hasAwardedTicketsRef.current = false;
    setEarnedTicketsThisRound(0);

    const initialSnake: Point[] = [
      { x: 10, y: 11 },
      { x: 9, y: 11 },
      { x: 8, y: 11 }
    ];

    const engine = engineRef.current;
    engine.snake = initialSnake;
    engine.dir = { x: 1, y: 0 };
    engine.nextDir = { x: 1, y: 0 };
    engine.food = spawnFood(initialSnake);
    engine.bonusFood = null;
    engine.score = 0;
    engine.foodsEaten = 0;
    engine.speedMs = 115;
    engine.lastTick = 0;
    engine.particles = [];
    engine.floatingTexts = [];
    engine.running = true;

    setScore(0);
    setFoodCount(0);
    setGameState('playing');
  }, []);

  // Direction changer helper (Guards against 180° instant suicide)
  const setDirection = useCallback((dx: number, dy: number) => {
    const current = engineRef.current.dir;
    if (dx !== 0 && current.x !== 0) return; // Prevent reversing X
    if (dy !== 0 && current.y !== 0) return; // Prevent reversing Y
    engineRef.current.nextDir = { x: dx, y: dy };
  }, []);

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const gameLoop = (timestamp: number) => {
      const engine = engineRef.current;
      const { snake, particles, floatingTexts } = engine;

      // Handle Logic Tick based on speedMs
      if (engine.running) {
        if (!engine.lastTick) engine.lastTick = timestamp;
        const elapsed = timestamp - engine.lastTick;

        if (elapsed >= engine.speedMs) {
          engine.lastTick = timestamp;

          // Apply buffered direction
          engine.dir = engine.nextDir;

          // Calculate new head position
          const head = snake[0];
          const newHead: Point = {
            x: head.x + engine.dir.x,
            y: head.y + engine.dir.y
          };

          // Check Wall Collisions
          const hitWall =
            newHead.x < 0 ||
            newHead.x >= GRID_SIZE ||
            newHead.y < 0 ||
            newHead.y >= GRID_SIZE;

          // Check Self Collision
          const hitSelf = snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y);

          if (hitWall || hitSelf) {
            engine.running = false;
            setGameState('gameover');
            playSound('die');
            screenShakeRef.current = 14;

            // Update high score
            if (engine.score > highScore) {
              setHighScore(engine.score);
              try {
                localStorage.setItem('retro_arcade_snake_highscore', engine.score.toString());
              } catch {
                // ignore
              }
            }

            finalizeTickets(engine.score, engine.foodsEaten);
          } else {
            // Move snake forward
            snake.unshift(newHead);

            // Check Food Eaten
            const ateRegularFood = newHead.x === engine.food.x && newHead.y === engine.food.y;
            const ateBonusFood =
              engine.bonusFood &&
              newHead.x === engine.bonusFood.x &&
              newHead.y === engine.bonusFood.y;

            if (ateRegularFood) {
              engine.foodsEaten++;
              engine.score += 10;
              setScore(engine.score);
              setFoodCount(engine.foodsEaten);
              playSound('eat');

              // Spawn eat particles
              for (let i = 0; i < 10; i++) {
                particles.push({
                  x: newHead.x * CELL_SIZE + CELL_SIZE / 2,
                  y: newHead.y * CELL_SIZE + CELL_SIZE / 2,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  color: '#39ff14',
                  alpha: 1,
                  size: 3
                });
              }

              floatingTexts.push({
                text: '+10',
                x: newHead.x * CELL_SIZE,
                y: newHead.y * CELL_SIZE - 4,
                alpha: 1,
                vy: -1,
                color: '#39ff14'
              });

              // Speed up slightly as snake grows
              engine.speedMs = Math.max(65, 115 - Math.floor(engine.foodsEaten / 3) * 3);

              // Spawn next regular food
              engine.food = spawnFood(snake);

              // Every 5 foods eaten, spawn a Golden Bonus Orb!
              if (engine.foodsEaten % 5 === 0 && !engine.bonusFood) {
                engine.bonusFood = {
                  ...spawnFood(snake),
                  timer: 60 // ~6 seconds
                };
              }
            } else if (ateBonusFood) {
              engine.score += 50;
              setScore(engine.score);
              playSound('bonus');
              engine.bonusFood = null;

              for (let i = 0; i < 16; i++) {
                particles.push({
                  x: newHead.x * CELL_SIZE + CELL_SIZE / 2,
                  y: newHead.y * CELL_SIZE + CELL_SIZE / 2,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: '#ffe600',
                  alpha: 1,
                  size: 4
                });
              }

              floatingTexts.push({
                text: '+50 GOLDEN!',
                x: newHead.x * CELL_SIZE,
                y: newHead.y * CELL_SIZE - 8,
                alpha: 1,
                vy: -1.2,
                color: '#ffe600'
              });
            } else {
              // Pop tail if no food eaten
              snake.pop();
            }

            // Decrement bonus food timer
            if (engine.bonusFood) {
              engine.bonusFood.timer--;
              if (engine.bonusFood.timer <= 0) engine.bonusFood = null;
            }
          }
        }
      }

      // Clear & Draw
      ctx.fillStyle = '#060b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (screenShakeRef.current > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.85;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // Draw Grid Matrix Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Regular Food (Pulsing Neon Apple/Orb)
      const food = engine.food;
      ctx.save();
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      // Shiny core
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2 - 2,
        food.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // Draw Bonus Golden Food (If active)
      if (engine.bonusFood) {
        const bf = engine.bonusFood;
        ctx.save();
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(
          bf.x * CELL_SIZE + CELL_SIZE / 2,
          bf.y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE / 2 - 1,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('★', bf.x * CELL_SIZE + 5, bf.y * CELL_SIZE + 14);
        ctx.restore();
      }

      // Draw Snake Segments
      snake.forEach((seg, index) => {
        const isHead = index === 0;
        ctx.save();
        if (isHead) {
          ctx.fillStyle = '#39ff14';
          ctx.shadowColor = '#39ff14';
          ctx.shadowBlur = 14;
        } else {
          // Gradient down to cyan
          const ratio = index / Math.max(1, snake.length);
          ctx.fillStyle = ratio < 0.5 ? '#2bdc12' : '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 6;
        }

        ctx.beginPath();
        ctx.roundRect(
          seg.x * CELL_SIZE + 1.5,
          seg.y * CELL_SIZE + 1.5,
          CELL_SIZE - 3,
          CELL_SIZE - 3,
          isHead ? 6 : 4
        );
        ctx.fill();

        // Eyes on snake head
        if (isHead) {
          ctx.fillStyle = '#000';
          const dir = engine.dir;
          let eye1X = seg.x * CELL_SIZE + 5;
          let eye1Y = seg.y * CELL_SIZE + 5;
          let eye2X = seg.x * CELL_SIZE + 13;
          let eye2Y = seg.y * CELL_SIZE + 5;

          if (dir.x === 1) {
            eye1X = seg.x * CELL_SIZE + 13; eye1Y = seg.y * CELL_SIZE + 5;
            eye2X = seg.x * CELL_SIZE + 13; eye2Y = seg.y * CELL_SIZE + 13;
          } else if (dir.x === -1) {
            eye1X = seg.x * CELL_SIZE + 4; eye1Y = seg.y * CELL_SIZE + 5;
            eye2X = seg.x * CELL_SIZE + 4; eye2Y = seg.y * CELL_SIZE + 13;
          } else if (dir.y === 1) {
            eye1X = seg.x * CELL_SIZE + 5; eye1Y = seg.y * CELL_SIZE + 13;
            eye2X = seg.x * CELL_SIZE + 13; eye2Y = seg.y * CELL_SIZE + 13;
          }

          ctx.fillRect(eye1X, eye1Y, 3, 3);
          ctx.fillRect(eye2X, eye2Y, 3, 3);
        }

        ctx.restore();
      });

      // Update & Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;
        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.restore();
      }

      // Update & Draw Floating Scores
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTexts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      if (screenShakeRef.current > 0) ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
        e.preventDefault();
      }

      if (key === 'arrowup' || key === 'w') setDirection(0, -1);
      else if (key === 'arrowdown' || key === 's') setDirection(0, 1);
      else if (key === 'arrowleft' || key === 'a') setDirection(-1, 0);
      else if (key === 'arrowright' || key === 'd') setDirection(1, 0);
      else if (key === ' ' || key === 'enter') {
        if (gameState !== 'playing') startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [finalizeTickets, gameState, highScore, playSound, setDirection, startGame]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Top Status Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0d1810',
          border: '3px solid #39ff14',
          borderRadius: '8px 8px 0 0',
          padding: '12px 20px',
          color: '#fff',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>SCORE</span>
            <span className="pixel-text glow-green" style={{ fontSize: '1.15rem', color: '#39ff14' }}>
              {score}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>LENGTH</span>
            <span className="pixel-text" style={{ fontSize: '1.1rem', color: '#00f0ff' }}>
              🐍 {foodCount + 3}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>BEST</span>
            <span className="pixel-text glow-yellow" style={{ fontSize: '1rem', color: '#ffe600' }}>
              {highScore}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="arcade-btn"
            style={{ fontSize: '0.7rem', padding: '6px 10px' }}
          >
            {isMuted ? '🔇 MUTED' : '🔊 SOUND'}
          </button>

          <div className="ticket-badge" style={{ padding: '4px 10px' }}>
            <span>{tickets} 🎟️</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Screen Wrapper */}
      <div
        style={{
          position: 'relative',
          background: '#060b14',
          border: '4px solid #39ff14',
          borderTop: 'none',
          boxShadow: '0 0 30px rgba(57, 255, 20, 0.4)',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            background: '#060b14'
          }}
        />

        {/* Start / Idle Screen */}
        {gameState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(6, 12, 18, 0.88)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🐍 ✨ 🍎</div>
            <h3 className="pixel-text glow-green" style={{ fontSize: '1.7rem', color: '#39ff14', marginBottom: '12px' }}>
              CYBER NEON SNAKE
            </h3>
            <p style={{ color: '#00f0ff', fontSize: '1.1rem', marginBottom: '22px', maxWidth: '380px' }}>
              Navigate the cyber grid, feast on energy orbs, dodge walls, and collect real tickets!
            </p>
            <button
              onClick={startGame}
              className="arcade-btn arcade-btn-yellow blink"
              style={{ fontSize: '1rem', padding: '14px 28px', marginBottom: '16px' }}
            >
              ▶ INSERT COIN &amp; PLAY
            </button>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Controls: <strong>WASD</strong> or <strong>Arrow Keys</strong> or <strong>D-Pad</strong>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(18, 6, 10, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <h3 className="pixel-text glow-pink" style={{ fontSize: '2rem', color: '#ff007f', marginBottom: '12px' }}>
              CRASHED!
            </h3>
            <div className="pixel-text" style={{ fontSize: '1rem', color: '#ffe600', marginBottom: '8px' }}>
              FINAL SCORE: {score} &bull; ORBS: {foodCount}
            </div>
            {earnedTicketsThisRound > 0 && (
              <div
                className="pixel-text glow-green"
                style={{
                  fontSize: '0.95rem',
                  color: '#39ff14',
                  background: '#0d2818',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  marginBottom: '22px'
                }}
              >
                + {earnedTicketsThisRound} TICKETS EARNED! 🎟️
              </div>
            )}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button onClick={startGame} className="arcade-btn arcade-btn-yellow">
                🔄 PLAY AGAIN
              </button>
              <Link href="/prizes" className="arcade-btn arcade-btn-pink">
                🎁 REDEEM PRIZES
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen Touch D-Pad Deck */}
      <div
        style={{
          background: '#0d1810',
          border: '2px solid #23233c',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div style={{ color: '#718096', fontSize: '0.8rem', marginBottom: '4px' }}>
          TOUCH / D-PAD CONTROLS
        </div>

        {/* D-Pad Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => { setDirection(0, -1); if (gameState !== 'playing') startGame(); }}
            className="arcade-btn"
            style={{ fontSize: '0.9rem', padding: '8px 24px' }}
          >
            ▲ UP
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setDirection(-1, 0); if (gameState !== 'playing') startGame(); }}
              className="arcade-btn"
              style={{ fontSize: '0.9rem', padding: '8px 20px' }}
            >
              ◀ LEFT
            </button>
            <button
              onClick={() => { setDirection(0, 1); if (gameState !== 'playing') startGame(); }}
              className="arcade-btn"
              style={{ fontSize: '0.9rem', padding: '8px 20px' }}
            >
              ▼ DOWN
            </button>
            <button
              onClick={() => { setDirection(1, 0); if (gameState !== 'playing') startGame(); }}
              className="arcade-btn"
              style={{ fontSize: '0.9rem', padding: '8px 20px' }}
            >
              RIGHT ▶
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
