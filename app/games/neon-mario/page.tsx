'use client';

import React from 'react';
import Link from 'next/link';
import NeonMario from '@/components/games/NeonMario';

export default function NeonMarioPage() {
  return (
    <div style={{ maxWidth: '980px', margin: '20px auto', padding: '0 20px' }}>
      
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
          borderColor: '#ff3b30',
          boxShadow: '0 15px 45px rgba(0,0,0,0.9), 0 0 35px rgba(255, 59, 48, 0.4)',
          marginBottom: '35px'
        }}
      >
        {/* Cabinet Marquee Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #3a1414, #1a0808, #3a1414)',
            borderBottom: '4px solid #ff3b30',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2.6rem', marginBottom: '4px' }}>🍄</div>
          <h2
            className="pixel-text glow-pink"
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.3rem)',
              color: '#ff3b30',
              margin: '0 0 6px 0'
            }}
          >
            SUPER NEON PLUMBER
          </h2>
          <span
            className="pixel-text"
            style={{
              fontSize: '0.75rem',
              color: '#ffe600',
              letterSpacing: '0.1em'
            }}
          >
            SIDE-SCROLLING ADVENTURE &bull; 60 FPS PLATFORMER
          </span>
        </div>

        {/* Playable Game Area */}
        <div style={{ padding: '24px' }}>
          <NeonMario />
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
            🕹️ <strong>Controls:</strong> A / D or Arrow Keys to run &bull; Space or W to Jump &bull; On-screen touch buttons for mobile.
          </div>
          <div style={{ color: '#ffe600' }}>
            🎟️ <strong>Rewards:</strong> 1 Ticket per 2 Coins + 1 per 80 Points + 25 Flagpole Bonus!
          </div>
        </div>
      </div>

    </div>
  );
}
