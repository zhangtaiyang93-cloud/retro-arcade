'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTickets } from '@/context/TicketContext';
import confetti from 'canvas-confetti';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  alive: boolean;
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
  color: string;
  alpha: number;
  vy: number;
}

export default function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { tickets, addTickets } = useTickets();

  // Game UI States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [combo, setCombo] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [earnedTicketsThisRound, setEarnedTicketsThisRound] = useState<number>(0);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Edge case guard: Ensure tickets are ONLY awarded once per round!
  const hasAwardedTicketsRef = useRef<boolean>(false);

  // Screen shake timer
  const screenShakeRef = useRef<number>(0);

  // Play retro synthesized sound
  const playSound = useCallback((type: 'hit' | 'paddle' | 'wall' | 'lose' | 'win' | 'ticket') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'paddle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(380, now + 0.07);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'wall') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'win') {
        // Arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.type = 'square';
          noteOsc.frequency.setValueAtTime(freq, now + i * 0.1);
          noteGain.gain.setValueAtTime(0.15, now + i * 0.1);
          noteGain.gain.linearRampToValueAtTime(0.01, now + i * 0.1 + 0.18);
          noteOsc.start(now + i * 0.1);
          noteOsc.stop(now + i * 0.1 + 0.18);
        });
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

  // Game Engine Mutable State Refs (Prevents React re-render lag during 60FPS loop)
  const engineRef = useRef({
    paddle: { x: 260, y: 440, width: 110, height: 14, speed: 8 },
    ball: { x: 320, y: 360, radius: 8, vx: 4, vy: -4, speed: 5.5 },
    bricks: [] as Brick[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    keys: { left: false, right: false },
    score: 0,
    lives: 3,
    combo: 0,
    animFrame: 0,
    running: false
  });

  // Brick layout generator
  const createBricks = useCallback(() => {
    const rows = 5;
    const cols = 8;
    const brickWidth = 66;
    const brickHeight = 22;
    const padding = 8;
    const offsetTop = 45;
    const offsetLeft = 24;

    const rowColors = [
      { color: '#ff007f', points: 50 }, // Magenta
      { color: '#bc13fe', points: 40 }, // Purple
      { color: '#ffe600', points: 30 }, // Yellow
      { color: '#39ff14', points: 20 }, // Neon Green
      { color: '#00f0ff', points: 10 }, // Cyan
    ];

    const bricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetLeft + c * (brickWidth + padding),
          y: offsetTop + r * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          color: rowColors[r].color,
          points: rowColors[r].points,
          alive: true
        });
      }
    }
    return bricks;
  }, []);

  // Award tickets helper (With Edge Case Double-award protection!)
  const finalizeTickets = useCallback((finalScore: number, isWin: boolean) => {
    if (hasAwardedTicketsRef.current) return; // Prevent double award
    hasAwardedTicketsRef.current = true;

    // 1 ticket per 60 points, plus 15 bonus for victory
    const ticketsWon = Math.max(5, Math.floor(finalScore / 60) + (isWin ? 15 : 0));
    setEarnedTicketsThisRound(ticketsWon);
    addTickets(ticketsWon, `Brick Breaker ${isWin ? 'Victory' : 'Score'}`);
    playSound('ticket');

    if (isWin) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 }
      });
    }
  }, [addTickets, playSound]);

  // Start or Restart game
  const startGame = useCallback(() => {
    hasAwardedTicketsRef.current = false;
    setEarnedTicketsThisRound(0);

    const engine = engineRef.current;
    engine.paddle.x = 265;
    engine.ball.x = 320;
    engine.ball.y = 350;
    engine.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (3.5 + Math.random() * 1.5);
    engine.ball.vy = -4.5;
    engine.ball.speed = 5.5;
    engine.bricks = createBricks();
    engine.particles = [];
    engine.floatingTexts = [];
    engine.score = 0;
    engine.lives = 3;
    engine.combo = 0;
    engine.running = true;

    setScore(0);
    setLives(3);
    setCombo(0);
    setGameState('playing');
  }, [createBricks]);

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const gameLoop = () => {
      const engine = engineRef.current;
      const { paddle, ball, bricks, particles, floatingTexts, keys } = engine;

      // Clear Canvas
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Screen shake translation
      if (screenShakeRef.current > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // Draw Arcade Grid Background in canvas
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (engine.running) {
        // Move Paddle
        if (keys.left) paddle.x -= paddle.speed;
        if (keys.right) paddle.x += paddle.speed;
        // Clamp Paddle
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

        // Move Ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Ball - Wall Collisions
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
          playSound('wall');
        } else if (ball.x + ball.radius >= canvas.width) {
          ball.x = canvas.width - ball.radius;
          ball.vx = -Math.abs(ball.vx);
          playSound('wall');
        }

        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
          playSound('wall');
        }

        // Ball - Paddle Collision
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x >= paddle.x &&
          ball.x <= paddle.x + paddle.width
        ) {
          // Calculate bounce angle based on where ball hits paddle
          const hitOffset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
          const maxBounceAngle = Math.PI / 3; // 60 degrees
          const bounceAngle = hitOffset * maxBounceAngle;

          ball.speed = Math.min(10, ball.speed + 0.15); // Slight speedup
          ball.vx = ball.speed * Math.sin(bounceAngle);
          ball.vy = -ball.speed * Math.cos(bounceAngle);
          ball.y = paddle.y - ball.radius - 1;

          engine.combo = 0; // Reset combo when paddle hits
          setCombo(0);
          playSound('paddle');
        }

        // Ball - Bricks Collision
        let hitBrick = false;
        let remainingBricks = 0;

        for (const brick of bricks) {
          if (!brick.alive) continue;
          remainingBricks++;

          if (
            ball.x + ball.radius >= brick.x &&
            ball.x - ball.radius <= brick.x + brick.width &&
            ball.y + ball.radius >= brick.y &&
            ball.y - ball.radius <= brick.y + brick.height
          ) {
            brick.alive = false;
            remainingBricks--;
            hitBrick = true;
            ball.vy = -ball.vy;

            // Combo & Points
            engine.combo++;
            setCombo(engine.combo);
            const comboMultiplier = Math.min(4, engine.combo);
            const pointsAwarded = brick.points * comboMultiplier;
            engine.score += pointsAwarded;
            setScore(engine.score);

            // Screen shake
            screenShakeRef.current = 4;
            playSound('hit');

            // Spawn Particles
            for (let i = 0; i < 10; i++) {
              particles.push({
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: brick.color,
                alpha: 1,
                size: Math.random() * 3 + 2
              });
            }

            // Floating Score Text
            floatingTexts.push({
              text: `+${pointsAwarded}${engine.combo > 1 ? ` (x${engine.combo})` : ''}`,
              x: brick.x + 10,
              y: brick.y,
              color: brick.color,
              alpha: 1,
              vy: -1.2
            });

            break; // Handle one brick per frame
          }
        }

        // Victory Condition Check: All bricks destroyed!
        if (remainingBricks === 0) {
          engine.running = false;
          setGameState('victory');
          playSound('win');
          finalizeTickets(engine.score, true);
        }

        // Ball fell off bottom (Lose Life)
        if (ball.y - ball.radius > canvas.height) {
          engine.lives--;
          setLives(engine.lives);
          playSound('lose');
          screenShakeRef.current = 10;

          if (engine.lives <= 0) {
            engine.running = false;
            setGameState('gameover');
            finalizeTickets(engine.score, false);
          } else {
            // Reset ball onto paddle
            ball.x = paddle.x + paddle.width / 2;
            ball.y = paddle.y - 20;
            ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3.5;
            ball.vy = -4.5;
            ball.speed = 5.5;
          }
        }
      }

      // Draw Bricks
      for (const brick of bricks) {
        if (!brick.alive) continue;
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        // Highlight sheen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(brick.x, brick.y, brick.width, 3);
        ctx.shadowBlur = 0;
      }

      // Draw Paddle
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
      ctx.fill();
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(paddle.x + paddle.width / 2 - 8, paddle.y + 2, 16, paddle.height - 4);
      ctx.shadowBlur = 0;

      // Draw Ball
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Update & Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      }

      // Update & Draw Floating Texts
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

      if (screenShakeRef.current > 0) {
        ctx.restore();
      }

      animId = requestAnimationFrame(gameLoop);
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        engineRef.current.keys.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        engineRef.current.keys.right = true;
      } else if (e.code === 'Space') {
        if (gameState === 'idle' || gameState === 'gameover' || gameState === 'victory') {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        engineRef.current.keys.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        engineRef.current.keys.right = false;
      }
    };

    // Mouse paddle tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const paddle = engineRef.current.paddle;
      paddle.x = mouseX - paddle.width / 2;
    };

    // Touch paddle tracking
    const handleTouchMove = (e: TouchEvent) => {
      if (!canvas || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const paddle = engineRef.current.paddle;
      paddle.x = touchX - paddle.width / 2;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Initial bricks
    engineRef.current.bricks = createBricks();

    animId = requestAnimationFrame(gameLoop);

    // CRITICAL EDGE CASE CLEANUP: Never leave timers or animation loops running!
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas?.removeEventListener('mousemove', handleMouseMove);
      canvas?.removeEventListener('touchmove', handleTouchMove);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [createBricks, finalizeTickets, gameState, playSound, startGame]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Game Cabinet Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#121226',
          border: '2px solid #ff007f',
          borderRadius: '8px 8px 0 0',
          padding: '12px 20px',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#718096', display: 'block' }}>SCORE</span>
            <span className="pixel-text glow-yellow" style={{ fontSize: '1.1rem', color: '#ffe600' }}>
              {score}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: '#718096', display: 'block' }}>LIVES</span>
            <span style={{ fontSize: '1.1rem' }}>
              {'❤️'.repeat(Math.max(0, lives))}
            </span>
          </div>

          {combo > 1 && (
            <div className="pixel-text glow-pink" style={{ color: '#ff007f', fontSize: '0.8rem' }}>
              COMBO x{combo}!
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="arcade-btn"
            style={{ fontSize: '0.7rem', padding: '6px 10px' }}
          >
            {isMuted ? '🔇 MUTED' : '🔊 SOUND ON'}
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
          background: '#0a0a14',
          border: '4px solid #ff007f',
          borderTop: 'none',
          boxShadow: '0 0 25px rgba(255, 0, 127, 0.4)',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            background: '#0a0a14',
            cursor: gameState === 'playing' ? 'none' : 'default'
          }}
        />

        {/* Start / Overlay Screen */}
        {gameState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 10, 20, 0.88)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <h3 className="pixel-text glow-pink" style={{ fontSize: '1.6rem', color: '#ff007f', marginBottom: '14px' }}>
              NEON BRICK BREAKER
            </h3>
            <p style={{ color: '#00f0ff', fontSize: '1.1rem', marginBottom: '20px', maxWidth: '420px' }}>
              Slide your paddle to shatter neon bricks, build combos, and earn real tickets for the Prize Counter!
            </p>
            <button
              onClick={startGame}
              className="arcade-btn arcade-btn-yellow blink"
              style={{ fontSize: '1rem', padding: '14px 28px', marginBottom: '20px' }}
            >
              ▶ INSERT COIN &amp; PLAY
            </button>
            <div style={{ color: '#718096', fontSize: '0.9rem' }}>
              Controls: <strong>Mouse</strong> or <strong>A/D</strong> or <strong>Arrow Keys</strong>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 8, 12, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <h3 className="pixel-text glow-pink" style={{ fontSize: '1.8rem', color: '#ff007f', marginBottom: '10px' }}>
              GAME OVER
            </h3>
            <div className="pixel-text" style={{ fontSize: '1rem', color: '#ffe600', marginBottom: '10px' }}>
              FINAL SCORE: {score}
            </div>
            {earnedTicketsThisRound > 0 && (
              <div
                className="pixel-text glow-green"
                style={{
                  fontSize: '0.9rem',
                  color: '#39ff14',
                  background: '#0d2818',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}
              >
                + {earnedTicketsThisRound} TICKETS WON! 🎟️
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

        {/* Victory Overlay */}
        {gameState === 'victory' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 20, 16, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <h3 className="pixel-text glow-green" style={{ fontSize: '1.8rem', color: '#39ff14', marginBottom: '10px' }}>
              ★ VICTORY! ★
            </h3>
            <p style={{ color: '#00f0ff', fontSize: '1.1rem', marginBottom: '8px' }}>
              All neon brick barriers obliterated!
            </p>
            <div className="pixel-text" style={{ fontSize: '1.1rem', color: '#ffe600', marginBottom: '10px' }}>
              FINAL SCORE: {score}
            </div>
            {earnedTicketsThisRound > 0 && (
              <div
                className="pixel-text glow-yellow"
                style={{
                  fontSize: '1rem',
                  color: '#ffe600',
                  background: '#2a200a',
                  border: '2px solid #ffe600',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  marginBottom: '24px'
                }}
              >
                🎉 WON {earnedTicketsThisRound} TICKETS! 🎟️
              </div>
            )}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button onClick={startGame} className="arcade-btn arcade-btn-yellow">
                🔄 PLAY AGAIN
              </button>
              <Link href="/prizes" className="arcade-btn arcade-btn-pink">
                🎁 SPEND IN SHOP &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Touch Screen / Mobile Controls Bar */}
      <div
        style={{
          background: '#0d0d1a',
          border: '2px solid #23233c',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ color: '#718096', fontSize: '0.85rem' }}>
          💡 TIP: Drag finger or mouse on screen to control the paddle!
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onMouseDown={() => (engineRef.current.keys.left = true)}
            onMouseUp={() => (engineRef.current.keys.left = false)}
            onTouchStart={() => (engineRef.current.keys.left = true)}
            onTouchEnd={() => (engineRef.current.keys.left = false)}
            className="arcade-btn"
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            &larr; LEFT
          </button>
          <button
            onMouseDown={() => (engineRef.current.keys.right = true)}
            onMouseUp={() => (engineRef.current.keys.right = false)}
            onTouchStart={() => (engineRef.current.keys.right = true)}
            onTouchEnd={() => (engineRef.current.keys.right = false)}
            className="arcade-btn"
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            RIGHT &rarr;
          </button>
        </div>
      </div>

    </div>
  );
}
