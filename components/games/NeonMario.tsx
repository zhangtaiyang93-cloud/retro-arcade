'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTickets } from '@/context/TicketContext';
import confetti from 'canvas-confetti';

interface MysteryBlock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hit: boolean;
  bouncing: number; // visual offset when hit
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  isGround?: boolean;
}

interface Coin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  angle: number;
}

interface Goomba {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  alive: boolean;
  squashedTimer: number;
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

interface FloatingScore {
  text: string;
  x: number;
  y: number;
  alpha: number;
  vy: number;
  color: string;
}

export default function NeonMario() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { tickets, addTickets } = useTickets();

  // Game state
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState<number>(0);
  const [coinsCount, setCoinsCount] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [earnedTicketsThisRound, setEarnedTicketsThisRound] = useState<number>(0);

  // Audio Context ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Edge case guard: Ensure tickets are only awarded once per round!
  const hasAwardedTicketsRef = useRef<boolean>(false);

  // Screen shake
  const screenShakeRef = useRef<number>(0);

  // Synthesized Web Audio effects
  const playSound = useCallback((type: 'jump' | 'coin' | 'bump' | 'stomp' | 'hurt' | 'win' | 'ticket') => {
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

      if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'bump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'stomp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'win') {
        // Classic victory fanfare notes
        const notes = [
          { f: 523.25, d: 0.12 }, // C5
          { f: 659.25, d: 0.12 }, // E5
          { f: 783.99, d: 0.12 }, // G5
          { f: 1046.50, d: 0.35 } // C6
        ];
        let offset = 0;
        notes.forEach((n) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'square';
          o.frequency.setValueAtTime(n.f, now + offset);
          g.gain.setValueAtTime(0.2, now + offset);
          g.gain.linearRampToValueAtTime(0.01, now + offset + n.d);
          o.start(now + offset);
          o.stop(now + offset + n.d);
          offset += n.d;
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
      // AudioContext fallback
    }
  }, [isMuted]);

  // Game Engine mutable references
  const engineRef = useRef({
    player: {
      x: 60,
      y: 280,
      width: 24,
      height: 32,
      vx: 0,
      vy: 0,
      isGrounded: false,
      facing: 'right' as 'left' | 'right',
      invincibleTimer: 0,
      runAnim: 0
    },
    cameraX: 0,
    keys: { left: false, right: false, jump: false },
    score: 0,
    coins: 0,
    lives: 3,
    running: false,
    levelWidth: 2600,
    flagpoleX: 2420,
    platforms: [] as Platform[],
    mysteryBlocks: [] as MysteryBlock[],
    coinsList: [] as Coin[],
    goombas: [] as Goomba[],
    particles: [] as Particle[],
    floatingScores: [] as FloatingScore[]
  });

  // Level Builder
  const buildLevel = useCallback(() => {
    // 1. Platforms (Ground & Ledges)
    const platforms: Platform[] = [
      // Ground stretches with occasional gaps
      { x: 0, y: 360, width: 750, height: 60, isGround: true },
      { x: 830, y: 360, width: 650, height: 60, isGround: true },
      { x: 1560, y: 360, width: 1100, height: 60, isGround: true },

      // Raised ledges & pipes
      { x: 260, y: 270, width: 120, height: 18, color: '#bc13fe' },
      { x: 480, y: 220, width: 140, height: 18, color: '#00f0ff' },
      { x: 670, y: 310, width: 44, height: 50, color: '#39ff14' }, // Warp Pipe 1

      { x: 920, y: 260, width: 100, height: 18, color: '#ffe600' },
      { x: 1100, y: 200, width: 150, height: 18, color: '#ff007f' },
      { x: 1300, y: 290, width: 44, height: 70, color: '#39ff14' }, // Warp Pipe 2

      { x: 1650, y: 270, width: 110, height: 18, color: '#00f0ff' },
      { x: 1820, y: 210, width: 120, height: 18, color: '#bc13fe' },
      { x: 2020, y: 280, width: 160, height: 18, color: '#ffe600' },

      // Castle steps before flagpole
      { x: 2240, y: 330, width: 30, height: 30, color: '#4a5568' },
      { x: 2270, y: 300, width: 30, height: 60, color: '#4a5568' },
      { x: 2300, y: 270, width: 30, height: 90, color: '#4a5568' },
      { x: 2330, y: 240, width: 30, height: 120, color: '#4a5568' }
    ];

    // 2. Mystery "?" Blocks
    const mysteryBlocks: MysteryBlock[] = [
      { id: 1, x: 220, y: 230, width: 32, height: 32, hit: false, bouncing: 0 },
      { id: 2, x: 380, y: 230, width: 32, height: 32, hit: false, bouncing: 0 },
      { id: 3, x: 530, y: 140, width: 32, height: 32, hit: false, bouncing: 0 },
      { id: 4, x: 970, y: 170, width: 32, height: 32, hit: false, bouncing: 0 },
      { id: 5, x: 1160, y: 120, width: 32, height: 32, hit: false, bouncing: 0 },
      { id: 6, x: 1700, y: 180, width: 32, height: 32, hit: false, bouncing: 0 },
      { id: 7, x: 2080, y: 190, width: 32, height: 32, hit: false, bouncing: 0 }
    ];

    // 3. Floating Coins
    const coinsList: Coin[] = [
      { id: 1, x: 180, y: 320, collected: false, angle: 0 },
      { id: 2, x: 290, y: 235, collected: false, angle: 0 },
      { id: 3, x: 330, y: 235, collected: false, angle: 0 },
      { id: 4, x: 500, y: 185, collected: false, angle: 0 },
      { id: 5, x: 540, y: 185, collected: false, angle: 0 },
      { id: 6, x: 580, y: 185, collected: false, angle: 0 },
      { id: 7, x: 940, y: 225, collected: false, angle: 0 },
      { id: 8, x: 1130, y: 165, collected: false, angle: 0 },
      { id: 9, x: 1170, y: 165, collected: false, angle: 0 },
      { id: 10, x: 1210, y: 165, collected: false, angle: 0 },
      { id: 11, x: 1680, y: 235, collected: false, angle: 0 },
      { id: 12, x: 1850, y: 175, collected: false, angle: 0 },
      { id: 13, x: 1890, y: 175, collected: false, angle: 0 },
      { id: 14, x: 2050, y: 245, collected: false, angle: 0 },
      { id: 15, x: 2090, y: 245, collected: false, angle: 0 }
    ];

    // 4. Goombas (Walking enemies)
    const goombas: Goomba[] = [
      { id: 1, x: 420, y: 332, width: 28, height: 28, vx: -1.2, alive: true, squashedTimer: 0 },
      { id: 2, x: 600, y: 332, width: 28, height: 28, vx: -1.2, alive: true, squashedTimer: 0 },
      { id: 3, x: 1040, y: 332, width: 28, height: 28, vx: 1.2, alive: true, squashedTimer: 0 },
      { id: 4, x: 1220, y: 332, width: 28, height: 28, vx: -1.2, alive: true, squashedTimer: 0 },
      { id: 5, x: 1780, y: 332, width: 28, height: 28, vx: -1.4, alive: true, squashedTimer: 0 },
      { id: 6, x: 1980, y: 332, width: 28, height: 28, vx: 1.4, alive: true, squashedTimer: 0 },
      { id: 7, x: 2150, y: 332, width: 28, height: 28, vx: -1.2, alive: true, squashedTimer: 0 }
    ];

    return { platforms, mysteryBlocks, coinsList, goombas };
  }, []);

  // Award tickets helper (With Edge Case double-award protection)
  const finalizeTickets = useCallback((finalScore: number, finalCoins: number, isWin: boolean) => {
    if (hasAwardedTicketsRef.current) return;
    hasAwardedTicketsRef.current = true;

    // Formula: 1 ticket per 2 coins + 1 ticket per 80 points + 25 victory bonus
    const won = Math.max(5, Math.floor(finalCoins * 1.5) + Math.floor(finalScore / 80) + (isWin ? 25 : 0));
    setEarnedTicketsThisRound(won);
    addTickets(won, `Super Neon Plumber ${isWin ? 'Flagpole Victory' : 'Adventure'}`);
    playSound('ticket');

    if (isWin) {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }, [addTickets, playSound]);

  // Start game session
  const startGame = useCallback(() => {
    hasAwardedTicketsRef.current = false;
    setEarnedTicketsThisRound(0);

    const level = buildLevel();
    const engine = engineRef.current;
    engine.player.x = 60;
    engine.player.y = 280;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.isGrounded = false;
    engine.player.invincibleTimer = 0;
    engine.cameraX = 0;
    engine.platforms = level.platforms;
    engine.mysteryBlocks = level.mysteryBlocks;
    engine.coinsList = level.coinsList;
    engine.goombas = level.goombas;
    engine.particles = [];
    engine.floatingScores = [];
    engine.score = 0;
    engine.coins = 0;
    engine.lives = 3;
    engine.running = true;

    setScore(0);
    setCoinsCount(0);
    setLives(3);
    setGameState('playing');
  }, [buildLevel]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const gameLoop = () => {
      const engine = engineRef.current;
      const { player, keys, platforms, mysteryBlocks, coinsList, goombas, particles, floatingScores } = engine;

      // Clear canvas
      ctx.fillStyle = '#06060f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (screenShakeRef.current > 0) {
        ctx.save();
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.86;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // Physics & Updates
      if (engine.running) {
        // Player X Acceleration & Friction
        const accel = 0.26;
        const friction = 0.82;
        const maxSpeed = 2.8;

        if (keys.left) {
          player.vx -= accel;
          player.facing = 'left';
        } else if (keys.right) {
          player.vx += accel;
          player.facing = 'right';
        } else {
          player.vx *= friction;
          if (Math.abs(player.vx) < 0.05) player.vx = 0;
        }

        player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
        player.x += player.vx;

        if (Math.abs(player.vx) > 0.5 && player.isGrounded) {
          player.runAnim += Math.abs(player.vx) * 0.08;
        }

        // Horizontal Platform Collisions
        for (const p of platforms) {
          if (
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y + player.height > p.y
          ) {
            if (player.vx > 0) {
              player.x = p.x - player.width;
              player.vx = 0;
            } else if (player.vx < 0) {
              player.x = p.x + p.width;
              player.vx = 0;
            }
          }
        }

        // Player Jump & Gravity
        const gravity = 0.52;
        if (keys.jump && player.isGrounded) {
          player.vy = -10.8;
          player.isGrounded = false;
          playSound('jump');
          // Jump dust particles
          for (let i = 0; i < 6; i++) {
            particles.push({
              x: player.x + player.width / 2,
              y: player.y + player.height,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2,
              color: '#ffe600',
              alpha: 0.8,
              size: 3
            });
          }
        }

        player.vy += gravity;
        player.y += player.vy;
        player.isGrounded = false;

        // Vertical Platform Collisions
        for (const p of platforms) {
          if (
            player.x + player.width > p.x + 3 &&
            player.x < p.x + p.width - 3 &&
            player.y + player.height >= p.y &&
            player.y + player.height <= p.y + p.height + 14 &&
            player.vy >= 0
          ) {
            player.y = p.y - player.height;
            player.vy = 0;
            player.isGrounded = true;
          }
        }

        // Mystery Blocks Collision (Headbutt from below!)
        for (const mb of mysteryBlocks) {
          if (mb.bouncing > 0) mb.bouncing -= 1.5;

          // Headbutt check
          if (
            player.x + player.width > mb.x + 2 &&
            player.x < mb.x + mb.width - 2 &&
            player.y <= mb.y + mb.height &&
            player.y >= mb.y + mb.height - 14 &&
            player.vy < 0
          ) {
            player.y = mb.y + mb.height;
            player.vy = 1.5; // bounce down
            screenShakeRef.current = 5;

            if (!mb.hit) {
              mb.hit = true;
              mb.bouncing = 10;
              engine.coins++;
              engine.score += 150;
              setCoinsCount(engine.coins);
              setScore(engine.score);
              playSound('coin');

              // Pop coin animation particles
              for (let i = 0; i < 12; i++) {
                particles.push({
                  x: mb.x + mb.width / 2,
                  y: mb.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -Math.random() * 5 - 2,
                  color: '#ffe600',
                  alpha: 1,
                  size: 4
                });
              }

              floatingScores.push({
                text: '+100 🪙',
                x: mb.x,
                y: mb.y - 12,
                alpha: 1,
                vy: -1.2,
                color: '#ffe600'
              });
            } else {
              playSound('bump');
            }
          }
          // Stand on top of mystery block
          else if (
            player.x + player.width > mb.x + 2 &&
            player.x < mb.x + mb.width - 2 &&
            player.y + player.height >= mb.y &&
            player.y + player.height <= mb.y + mb.height / 2 &&
            player.vy >= 0
          ) {
            player.y = mb.y - player.height;
            player.vy = 0;
            player.isGrounded = true;
          }
        }

        // Coin pickups
        for (const c of coinsList) {
          if (!c.collected) {
            c.angle += 0.08;
            const dist = Math.hypot(
              player.x + player.width / 2 - c.x,
              player.y + player.height / 2 - c.y
            );
            if (dist < 22) {
              c.collected = true;
              engine.coins++;
              engine.score += 50;
              setCoinsCount(engine.coins);
              setScore(engine.score);
              playSound('coin');

              floatingScores.push({
                text: '+50',
                x: c.x,
                y: c.y - 10,
                alpha: 1,
                vy: -1.0,
                color: '#ffe600'
              });
            }
          }
        }

        // Goombas (Enemy AI & Collisions)
        if (player.invincibleTimer > 0) player.invincibleTimer--;

        for (const g of goombas) {
          if (!g.alive) continue;
          g.x += g.vx;

          // Turn around at platform edges or bounds
          if (g.x < 100 || g.x > 2400) g.vx = -g.vx;

          // Stomp check (Player falling onto Goomba's head)
          const isStomp =
            player.vy > 0 &&
            player.y + player.height >= g.y &&
            player.y + player.height <= g.y + 14 &&
            player.x + player.width > g.x &&
            player.x < g.x + g.width;

          if (isStomp) {
            g.alive = false;
            player.vy = -8.5; // Bounce up!
            engine.score += 200;
            setScore(engine.score);
            playSound('stomp');
            screenShakeRef.current = 6;

            for (let i = 0; i < 8; i++) {
              particles.push({
                x: g.x + g.width / 2,
                y: g.y + g.height / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 4,
                color: '#ff3b30',
                alpha: 1,
                size: 3
              });
            }

            floatingScores.push({
              text: '+200 STOMP!',
              x: g.x,
              y: g.y - 10,
              alpha: 1,
              vy: -1.2,
              color: '#39ff14'
            });
          }
          // Hit player from side
          else if (
            player.invincibleTimer === 0 &&
            player.x + player.width > g.x &&
            player.x < g.x + g.width &&
            player.y + player.height > g.y &&
            player.y < g.y + g.height
          ) {
            engine.lives--;
            setLives(engine.lives);
            player.invincibleTimer = 90; // ~1.5s invincibility flash
            screenShakeRef.current = 12;
            playSound('hurt');

            if (engine.lives <= 0) {
              engine.running = false;
              setGameState('gameover');
              finalizeTickets(engine.score, engine.coins, false);
            } else {
              // Knockback
              player.vy = -6;
              player.vx = player.x < g.x ? -5 : 5;
            }
          }
        }

        // Pitfall (Fall off bottom)
        if (player.y > canvas.height + 60) {
          engine.lives--;
          setLives(engine.lives);
          playSound('hurt');
          screenShakeRef.current = 12;

          if (engine.lives <= 0) {
            engine.running = false;
            setGameState('gameover');
            finalizeTickets(engine.score, engine.coins, false);
          } else {
            // Respawn at last safe checkpoint
            player.x = Math.max(60, player.x - 250);
            player.y = 200;
            player.vx = 0;
            player.vy = 0;
          }
        }

        // Flagpole Victory Check!
        if (player.x >= engine.flagpoleX) {
          engine.running = false;
          setGameState('victory');
          playSound('win');
          finalizeTickets(engine.score, engine.coins, true);
        }

        // Smooth Camera Tracking (Keep player centered)
        const targetCamX = player.x - canvas.width * 0.4;
        engine.cameraX += (targetCamX - engine.cameraX) * 0.12;
        if (engine.cameraX < 0) engine.cameraX = 0;
        if (engine.cameraX > engine.levelWidth - canvas.width) {
          engine.cameraX = engine.levelWidth - canvas.width;
        }
      }

      const camX = engine.cameraX;

      // Draw Parallax Neon Background Stars & Mountains
      ctx.fillStyle = 'rgba(188, 19, 254, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x < canvas.width; x += 120) {
        ctx.lineTo(x, canvas.height - 120 - Math.sin((x + camX * 0.2) * 0.015) * 50);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();

      // Camera Offset Transform
      ctx.save();
      ctx.translate(-Math.floor(camX), 0);

      // Draw Platforms & Ground
      for (const p of platforms) {
        if (p.isGround) {
          // Neon cyber ground
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(p.x, p.y, p.width, p.height);
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(p.x, p.y, p.width, 4); // Glowing top strip
        } else if (p.color === '#39ff14') {
          // Warp Pipe
          ctx.fillStyle = '#0f291e';
          ctx.strokeStyle = '#39ff14';
          ctx.lineWidth = 3;
          ctx.fillRect(p.x, p.y, p.width, p.height);
          ctx.strokeRect(p.x, p.y, p.width, p.height);
          // Pipe top rim
          ctx.fillRect(p.x - 4, p.y - 8, p.width + 8, 10);
          ctx.strokeRect(p.x - 4, p.y - 8, p.width + 8, 10);
        } else {
          // Floating Brick Ledge
          ctx.fillStyle = p.color || '#bc13fe';
          ctx.fillRect(p.x, p.y, p.width, p.height);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(p.x, p.y, p.width, 3);
        }
      }

      // Draw Mystery "?" Blocks
      for (const mb of mysteryBlocks) {
        const yOffset = mb.bouncing > 0 ? -Math.sin(mb.bouncing * 0.3) * 8 : 0;
        ctx.fillStyle = mb.hit ? '#33334d' : '#ffe600';
        ctx.shadowColor = mb.hit ? '#000' : '#ffe600';
        ctx.shadowBlur = mb.hit ? 0 : 12;
        ctx.fillRect(mb.x, mb.y + yOffset, mb.width, mb.height);

        // Draw "?"
        ctx.fillStyle = mb.hit ? '#666' : '#000';
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.fillText(mb.hit ? '▪' : '?', mb.x + 8, mb.y + yOffset + 22);
        ctx.shadowBlur = 0;
      }

      // Draw Coins
      for (const c of coinsList) {
        if (c.collected) continue;
        const scaleX = Math.abs(Math.cos(c.angle));
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(Math.max(0.2, scaleX), 1);
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#996600';
        ctx.font = '10px monospace';
        ctx.fillText('$', -3, 3);
        ctx.restore();
      }

      // Draw Goombas
      for (const g of goombas) {
        if (!g.alive) continue;
        ctx.fillStyle = '#ff3b30';
        ctx.shadowColor = '#ff3b30';
        ctx.shadowBlur = 8;
        // Mushroom cap
        ctx.beginPath();
        ctx.arc(g.x + g.width / 2, g.y + 12, 14, Math.PI, 0);
        ctx.fill();
        // Body & feet
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(g.x + 6, g.y + 12, g.width - 12, 12);
        ctx.fillStyle = '#000000';
        ctx.fillRect(g.x + 8, g.y + 14, 3, 5); // Eyes
        ctx.fillRect(g.x + g.width - 11, g.y + 14, 3, 5);
        ctx.shadowBlur = 0;
      }

      // Draw Finish Flagpole & Castle Banner
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(engine.flagpoleX, 100, 6, 260); // Flagpole
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(engine.flagpoleX + 3, 98, 8, 0, Math.PI * 2); // Gold ball on top
      ctx.fill();
      // Neon triangle flag
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.moveTo(engine.flagpoleX + 6, 110);
      ctx.lineTo(engine.flagpoleX + 50, 130);
      ctx.lineTo(engine.flagpoleX + 6, 150);
      ctx.fill();

      // Draw Player Character (Neon Plumber)
      if (player.invincibleTimer % 4 < 2) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        if (player.facing === 'left') ctx.scale(-1, 1);

        // Red cap
        ctx.fillStyle = '#ff3b30';
        ctx.shadowColor = '#ff3b30';
        ctx.shadowBlur = 10;
        ctx.fillRect(-10, -16, 20, 8);
        ctx.fillRect(-6, -18, 12, 4);

        // Face
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(-8, -8, 16, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(2, -6, 3, 4); // Eye
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, -2, 8, 3); // Moustache

        // Blue Overalls / Body
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.fillRect(-8, 0, 16, 12);

        // Feet (Running oscillation)
        ctx.fillStyle = '#92400e';
        const legOffset = Math.sin(player.runAnim) * 4;
        ctx.fillRect(-9, 12 + legOffset, 7, 5);
        ctx.fillRect(2, 12 - legOffset, 7, 5);

        ctx.restore();
      }

      // Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.025;
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

      // Draw Floating Scores
      for (let i = floatingScores.length - 1; i >= 0; i--) {
        const fs = floatingScores[i];
        fs.y += fs.vy;
        fs.alpha -= 0.02;
        if (fs.alpha <= 0) {
          floatingScores.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = fs.alpha;
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = fs.color;
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      }

      ctx.restore(); // Restore camera translation

      if (screenShakeRef.current > 0) ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        engineRef.current.keys.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        engineRef.current.keys.right = true;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engineRef.current.keys.jump = true;
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
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engineRef.current.keys.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial level layout
    const initialLevel = buildLevel();
    engineRef.current.platforms = initialLevel.platforms;
    engineRef.current.mysteryBlocks = initialLevel.mysteryBlocks;
    engineRef.current.coinsList = initialLevel.coinsList;
    engineRef.current.goombas = initialLevel.goombas;

    animId = requestAnimationFrame(gameLoop);

    // CLEANUP GUARD: Cancel animations & close audio context on unmount!
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [buildLevel, finalizeTickets, gameState, playSound, startGame]);

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Top Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#15152a',
          border: '3px solid #ff3b30',
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
            <span className="pixel-text glow-yellow" style={{ fontSize: '1.1rem', color: '#ffe600' }}>
              {score.toString().padStart(6, '0')}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>COINS</span>
            <span className="pixel-text glow-yellow" style={{ fontSize: '1.1rem', color: '#ffe600' }}>
              🪙 x{coinsCount}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>LIVES</span>
            <span style={{ fontSize: '1.1rem' }}>
              {'❤️'.repeat(Math.max(0, lives))}
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
          background: '#06060f',
          border: '4px solid #ff3b30',
          borderTop: 'none',
          boxShadow: '0 0 30px rgba(255, 59, 48, 0.4)',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          width={700}
          height={420}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            background: '#06060f'
          }}
        />

        {/* Start / Overlay Screen */}
        {gameState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 10, 24, 0.88)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🍄 🏃‍♂️ ⭐️</div>
            <h3 className="pixel-text glow-pink" style={{ fontSize: '1.7rem', color: '#ff3b30', marginBottom: '12px' }}>
              SUPER NEON PLUMBER
            </h3>
            <p style={{ color: '#00f0ff', fontSize: '1.15rem', marginBottom: '22px', maxWidth: '480px' }}>
              Run across neon terrain, headbutt <strong>?</strong> mystery blocks for shiny coins, stomp patrolling goombas, and leap onto the high flagpole!
            </p>
            <button
              onClick={startGame}
              className="arcade-btn arcade-btn-yellow blink"
              style={{ fontSize: '1rem', padding: '14px 28px', marginBottom: '20px' }}
            >
              ▶ INSERT COIN &amp; PLAY
            </button>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Controls: <strong>A / D</strong> or <strong>Arrow Keys</strong> to Run &bull; <strong>Space / W</strong> to Jump
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(18, 8, 10, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <h3 className="pixel-text glow-pink" style={{ fontSize: '2rem', color: '#ff3b30', marginBottom: '12px' }}>
              GAME OVER
            </h3>
            <div className="pixel-text" style={{ fontSize: '1rem', color: '#ffe600', marginBottom: '8px' }}>
              FINAL SCORE: {score} &bull; COINS: {coinsCount}
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
                🔄 RETRY ADVENTURE
              </button>
              <Link href="/prizes" className="arcade-btn arcade-btn-pink">
                🎁 VISIT PRIZE SHOP
              </Link>
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'victory' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(6, 24, 16, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🚩 🏆 ⭐️</div>
            <h3 className="pixel-text glow-green" style={{ fontSize: '2rem', color: '#39ff14', marginBottom: '10px' }}>
              ★ COURSE CLEAR! ★
            </h3>
            <p style={{ color: '#00f0ff', fontSize: '1.15rem', marginBottom: '10px' }}>
              You leaped onto the flagpole and conquered the course!
            </p>
            <div className="pixel-text" style={{ fontSize: '1.1rem', color: '#ffe600', marginBottom: '14px' }}>
              SCORE: {score} &bull; COINS: {coinsCount}
            </div>
            {earnedTicketsThisRound > 0 && (
              <div
                className="pixel-text glow-yellow"
                style={{
                  fontSize: '1.1rem',
                  color: '#ffe600',
                  background: '#2b2108',
                  border: '2px solid #ffe600',
                  padding: '12px 24px',
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
                🎁 SPEND TICKETS IN SHOP &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen Mobile Touch Controls Deck */}
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
          💡 TIP: Headbutt <strong>?</strong> blocks for coins &bull; Stomp enemies from above!
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onMouseDown={() => (engineRef.current.keys.left = true)}
            onMouseUp={() => (engineRef.current.keys.left = false)}
            onTouchStart={() => (engineRef.current.keys.left = true)}
            onTouchEnd={() => (engineRef.current.keys.left = false)}
            className="arcade-btn"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            &larr; LEFT
          </button>
          <button
            onMouseDown={() => (engineRef.current.keys.right = true)}
            onMouseUp={() => (engineRef.current.keys.right = false)}
            onTouchStart={() => (engineRef.current.keys.right = true)}
            onTouchEnd={() => (engineRef.current.keys.right = false)}
            className="arcade-btn"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            RIGHT &rarr;
          </button>
          <button
            onMouseDown={() => {
              engineRef.current.keys.jump = true;
              if (gameState !== 'playing') startGame();
            }}
            onMouseUp={() => (engineRef.current.keys.jump = false)}
            onTouchStart={() => {
              engineRef.current.keys.jump = true;
              if (gameState !== 'playing') startGame();
            }}
            onTouchEnd={() => (engineRef.current.keys.jump = false)}
            className="arcade-btn arcade-btn-yellow"
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            JUMP ⬆️
          </button>
        </div>
      </div>

    </div>
  );
}
