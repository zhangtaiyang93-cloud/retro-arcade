'use client';

import React from 'react';
import Link from 'next/link';
import { ARCADE_GAMES } from '@/lib/games';
import { useTickets } from '@/context/TicketContext';

export default function ArcadeFloorPage() {
  const { tickets, addTickets } = useTickets();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      
      {/* Hero Marquee */}
      <section style={{ textAlign: 'center', marginBottom: '45px', position: 'relative' }}>
        <div
          className="pixel-text glow-yellow blink"
          style={{ fontSize: '0.85rem', color: '#ffe600', marginBottom: '12px' }}
        >
          ★ ★ ★ INSERT COIN TO PLAY ★ ★ ★
        </div>
        <h2
          className="pixel-text glow-cyan"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            color: '#00f0ff',
            marginBottom: '14px',
            lineHeight: 1.3
          }}
        >
          WELCOME TO THE ARCADE FLOOR
        </h2>
        <p style={{ maxWidth: '680px', margin: '0 auto 24px', color: '#a0aec0', fontSize: '1.25rem' }}>
          Explore our multiplayer arcade lineup. Win classic retro games, collect tickets, and trade them for rare swag at the Prize Counter!
        </p>

        {/* Quick Arcade Token Dispenser */}
        <div style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => addTickets(10, 'Daily Token Drop')}
            className="arcade-btn arcade-btn-yellow"
          >
            🎟️ CLAIM +10 DAILY TICKETS
          </button>
          <Link href="/prizes" className="arcade-btn arcade-btn-pink">
            🎁 VISIT PRIZE SHOP
          </Link>
        </div>
      </section>

      {/* Arcade Cabinets Grid */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', borderBottom: '2px solid #23233c', paddingBottom: '10px' }}>
          <h3 className="pixel-text glow-pink" style={{ fontSize: '1.1rem', color: '#ff007f', margin: 0 }}>
            🕹️ ARCADE CABINETS ({ARCADE_GAMES.length})
          </h3>
          <span style={{ fontSize: '1rem', color: '#718096' }}>
            Choose a cabinet to play or collaborate
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '30px',
            marginBottom: '50px'
          }}
        >
          {ARCADE_GAMES.map((game) => (
            <div
              key={game.id}
              className="cabinet-frame"
              style={{
                borderColor: game.accentColor,
                boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 15px ${game.accentColor}33`,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Cabinet Marquee Header */}
              <div
                style={{
                  background: game.cabinetColor,
                  borderBottom: `3px solid ${game.accentColor}`,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{game.icon}</span>
                  <div>
                    <h4 className="pixel-text" style={{ fontSize: '0.95rem', color: '#fff', margin: 0 }}>
                      {game.title}
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: game.accentColor }}>
                      {game.genre}
                    </span>
                  </div>
                </div>

                <span
                  className="pixel-text"
                  style={{
                    fontSize: '0.65rem',
                    background: '#090912',
                    border: `1px solid ${game.accentColor}`,
                    color: game.accentColor,
                    padding: '4px 8px',
                    borderRadius: '3px'
                  }}
                >
                  {game.status}
                </span>
              </div>

              {/* CRT Cabinet Screen */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="crt-screen" style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ color: '#00f0ff', fontSize: '1.15rem', marginBottom: '8px', fontStyle: 'italic' }}>
                    &ldquo;{game.tagline}&rdquo;
                  </p>
                  <p style={{ color: '#8892b0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    {game.description}
                  </p>
                </div>

                {/* Cabinet Info Specs */}
                <div style={{ background: '#0c0c16', border: '1px solid #1c1c30', borderRadius: '4px', padding: '12px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#718096' }}>Teammate:</span>
                    <strong style={{ color: '#e2e8f0' }}>{game.author}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#718096' }}>Ticket Rewards:</span>
                    <strong style={{ color: '#ffe600' }}>{game.ticketReward}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#718096' }}>Controls:</span>
                    <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>{game.controlsTip}</span>
                  </div>
                </div>

                {/* Cabinet Control Panel Button */}
                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <Link
                    href={`/games/${game.slug}`}
                    className="arcade-btn"
                    style={{
                      width: '100%',
                      borderColor: game.accentColor,
                      color: game.accentColor,
                      boxShadow: `4px 4px 0px #000, 0 0 10px ${game.accentColor}66`
                    }}
                  >
                    ENTER CABINET &rarr;
                  </Link>
                </div>
              </div>

              {/* Cabinet Bottom Coin Return */}
              <div
                style={{
                  background: '#090910',
                  borderTop: '2px solid #1f1f33',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: '#4a5568'
                }}
              >
                <span>[ 25¢ INSERT COIN ]</span>
                <span>STATUS: STANDBY</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collaboration Quick Guide For Teammates */}
      <section
        style={{
          background: '#111122',
          border: '2px solid #00f0ff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.6rem' }}>🛠️</span>
          <h3 className="pixel-text glow-cyan" style={{ fontSize: '1rem', color: '#00f0ff', margin: 0 }}>
            TEAM COLLABORATION QUICK GUIDE
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', color: '#cbd5e0', fontSize: '1.05rem' }}>
          <div style={{ background: '#0a0a14', padding: '14px', borderRadius: '4px', borderLeft: '4px solid #00f0ff' }}>
            <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '4px' }}>1. Pick your game</strong>
            Check <code>lib/games.ts</code> to assign your name and customize game details.
          </div>
          <div style={{ background: '#0a0a14', padding: '14px', borderRadius: '4px', borderLeft: '4px solid #ff007f' }}>
            <strong style={{ color: '#ff007f', display: 'block', marginBottom: '4px' }}>2. Work on a branch</strong>
            <code>git checkout -b feature/your-game-name</code> to keep changes isolated.
          </div>
          <div style={{ background: '#0a0a14', padding: '14px', borderRadius: '4px', borderLeft: '4px solid #ffe600' }}>
            <strong style={{ color: '#ffe600', display: 'block', marginBottom: '4px' }}>3. Award tickets</strong>
            Use <code>addTickets(score)</code> from <code>useTickets()</code> to award players!
          </div>
          <div style={{ background: '#0a0a14', padding: '14px', borderRadius: '4px', borderLeft: '4px solid #39ff14' }}>
            <strong style={{ color: '#39ff14', display: 'block', marginBottom: '4px' }}>4. Open a Pull Request</strong>
            Push your branch to GitHub and ask the team/owner to review &amp; merge!
          </div>
        </div>
      </section>

    </div>
  );
}
