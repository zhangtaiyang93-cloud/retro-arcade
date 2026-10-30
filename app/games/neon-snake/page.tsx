'use client';

import React from 'react';
import Link from 'next/link';
import NeonSnake from '@/components/games/NeonSnake';

export default function NeonSnakePage() {
  return (
    <div style={{ maxWidth: '960px', margin: '20px auto', padding: '0 20px' }}>
      
      {/* Top Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link href="/" className="arcade-btn" style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
          &larr; BACK TO ARCADE FLOOR
        </Link>
        <Link href="/prizes" className="arcade-btn arcade-btn-yellow" style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
          🎁 REDEEM PRIZES &rarr;
        </Link>
      </div>

      {/* Main Arcade Cabinet */}
      <div
        className="cabinet-frame"
        style={{
          borderColor: '#39ff14',
          boxShadow: '0 15px 45px rgba(0,0,0,0.9), 0 0 35px rgba(57, 255, 20, 0.4)',
          marginBottom: '35px'
        }}
      >
        {/* Cabinet Marquee Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0d2818, #06150c, #0d2818)',
            borderBottom: '4px solid #39ff14',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2.6rem', marginBottom: '4px' }}>🐍</div>
          <h2
            className="pixel-text glow-green"
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.3rem)',
              color: '#39ff14',
              margin: '0 0 6px 0'
            }}
          >
            CYBER NEON SNAKE
          </h2>
          <span
            className="pixel-text"
            style={{
              fontSize: '0.75rem',
              color: '#00f0ff',
              letterSpacing: '0.1em'
            }}
          >
            CABINET BY TAIYANG &bull; SYNTHWAVE GRID SURVIVAL
          </span>
        </div>

        {/* Playable Game Area */}
        <div style={{ padding: '24px' }}>
          <NeonSnake />
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
            🕹️ <strong>Controls:</strong> WASD or Arrow Keys to turn &bull; On-screen virtual D-Pad for mobile.
          </div>
          <div style={{ color: '#ffe600' }}>
            🎟️ <strong>Rewards:</strong> 1 Ticket per 3 Orbs + 1 per 80 Score!
          </div>
        </div>
      </div>

    </div>
  );
}
