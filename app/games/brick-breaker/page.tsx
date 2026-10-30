'use client';

import React from 'react';
import Link from 'next/link';
import BrickBreaker from '@/components/games/BrickBreaker';

export default function BrickBreakerPage() {
  return (
    <div style={{ maxWidth: '960px', margin: '20px auto', padding: '0 20px' }}>
      
      {/* Navigation header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link href="/" className="arcade-btn" style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
          &larr; BACK TO ARCADE FLOOR
        </Link>
        <Link href="/prizes" className="arcade-btn arcade-btn-yellow" style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
          🎁 PRIZE COUNTER &rarr;
        </Link>
      </div>

      {/* Main Cabinet */}
      <div
        className="cabinet-frame"
        style={{
          borderColor: '#ff007f',
          boxShadow: '0 15px 45px rgba(0,0,0,0.9), 0 0 30px rgba(255, 0, 127, 0.4)',
          marginBottom: '35px'
        }}
      >
        {/* Cabinet Marquee Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #3b122f, #1c0a1a, #3b122f)',
            borderBottom: '4px solid #ff007f',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>🧱</div>
          <h2
            className="pixel-text glow-pink"
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
              color: '#ff007f',
              margin: '0 0 6px 0'
            }}
          >
            BRICK BREAKER ARCADE
          </h2>
          <span
            className="pixel-text"
            style={{
              fontSize: '0.75rem',
              color: '#00f0ff',
              letterSpacing: '0.1em'
            }}
          >
            CABINET BY TAIYANG &bull; 60 FPS RETRO PHYSICS
          </span>
        </div>

        {/* Playable Game Area */}
        <div style={{ padding: '24px' }}>
          <BrickBreaker />
        </div>

        {/* Cabinet Base Info */}
        <div
          style={{
            background: '#090910',
            borderTop: '2px solid #1f1f33',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
            color: '#718096'
          }}
        >
          <div>
            🕹️ <strong>Controls:</strong> Mouse Move, A/D, or Arrow Keys. Mobile touch supported.
          </div>
          <div style={{ color: '#ffe600' }}>
            🎟️ <strong>Rewards:</strong> 1 Ticket per 60 Points + 15 Victory Bonus!
          </div>
        </div>
      </div>

    </div>
  );
}
