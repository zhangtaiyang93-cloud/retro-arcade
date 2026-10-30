'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { getGameBySlug, ARCADE_GAMES } from '@/lib/games';
import { useTickets } from '@/context/TicketContext';

export default function GameCabinetPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const game = getGameBySlug(slug);
  const { tickets, addTickets } = useTickets();

  if (!game) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', textAlign: 'center', padding: '20px' }}>
        <h2 className="pixel-text glow-pink" style={{ color: '#ff007f', marginBottom: '20px' }}>
          404 - CABINET NOT FOUND
        </h2>
        <p style={{ color: '#aaa', marginBottom: '30px' }}>
          This arcade cabinet has been moved or retired.
        </p>
        <Link href="/" className="arcade-btn">
          &larr; BACK TO ARCADE FLOOR
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Top Navigation breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link href="/" className="arcade-btn" style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
          &larr; BACK TO FLOOR
        </Link>
        <div className="ticket-badge">
          <span>YOUR TICKETS:</span>
          <span className="pixel-text glow-yellow">{tickets}</span>
          <span>🎟️</span>
        </div>
      </div>

      {/* Main Arcade Cabinet */}
      <div
        className="cabinet-frame"
        style={{
          borderColor: game.accentColor,
          boxShadow: `0 15px 40px rgba(0,0,0,0.9), 0 0 25px ${game.accentColor}44`,
          marginBottom: '35px'
        }}
      >
        {/* Cabinet Marquee */}
        <div
          style={{
            background: game.cabinetColor,
            borderBottom: `4px solid ${game.accentColor}`,
            padding: '24px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{game.icon}</div>
          <h2
            className="pixel-text"
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
              color: '#fff',
              textShadow: `0 0 10px ${game.accentColor}`,
              margin: '0 0 8px 0'
            }}
          >
            {game.title}
          </h2>
          <span
            className="pixel-text"
            style={{
              fontSize: '0.75rem',
              color: game.accentColor,
              letterSpacing: '0.1em'
            }}
          >
            CABINET ASSIGNED TO: {game.author} &bull; {game.genre}
          </span>
        </div>

        {/* CRT Gaming Screen Area */}
        <div style={{ padding: '30px' }}>
          <div
            className="crt-screen"
            style={{
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              border: `2px solid ${game.accentColor}66`,
              padding: '40px 20px'
            }}
          >
            <div
              className="pixel-text glow-yellow blink"
              style={{
                fontSize: '1.4rem',
                color: '#ffe600',
                marginBottom: '16px'
              }}
            >
              ★ COMING SOON ★
            </div>

            <p style={{ color: '#00f0ff', fontSize: '1.3rem', maxWidth: '580px', marginBottom: '24px' }}>
              This classic arcade game is currently under active construction by <strong>{game.author}</strong>!
            </p>

            <div
              style={{
                background: '#0e0e1a',
                border: '1px dashed #3a3a60',
                borderRadius: '6px',
                padding: '16px 20px',
                maxWidth: '600px',
                marginBottom: '28px',
                textAlign: 'left',
                fontSize: '0.95rem',
                color: '#a0aec0'
              }}
            >
              <div className="pixel-text" style={{ fontSize: '0.7rem', color: '#39ff14', marginBottom: '8px' }}>
                &gt; INSTRUCTIONS FOR {game.author.toUpperCase()}:
              </div>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Work on git branch: <code>feature/{game.slug}</code></li>
                <li>Build your game canvas or React component in this route: <code>app/games/[slug]/page.tsx</code></li>
                <li>Import <code>useTickets()</code> from <code>@/context/TicketContext</code></li>
                <li>Trigger <code>addTickets(points)</code> upon winning to award tickets!</li>
              </ul>
            </div>

            {/* Interactive Test Button */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => addTickets(25, `${game.title} Victory Test`)}
                className="arcade-btn arcade-btn-yellow"
                style={{ fontSize: '0.8rem' }}
              >
                🎮 TEST WIN TICKETS (+25 🎟️)
              </button>
              <Link href="/prizes" className="arcade-btn arcade-btn-pink" style={{ fontSize: '0.8rem' }}>
                🎁 SPEND AT PRIZE SHOP
              </Link>
            </div>
          </div>
        </div>

        {/* Physical Cabinet Control Deck Illustration */}
        <div
          style={{
            background: '#101020',
            borderTop: '3px solid #23233c',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Joystick art */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ff007f',
                boxShadow: '0 0 10px #ff007f, inset -3px -3px 8px #000'
              }}
            />
            <span style={{ fontSize: '0.85rem', color: '#718096' }}>JOYSTICK 1P</span>
          </div>

          {/* Arcade Push Buttons art */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {['#00f0ff', '#ffe600', '#39ff14'].map((color, idx) => (
              <div
                key={idx}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 8px ${color}, inset -2px -2px 6px #000`
                }}
              />
            ))}
          </div>

          <div style={{ color: '#4a5568', fontSize: '0.85rem' }}>
            CABINET HARDWARE VER: 1.0.0
          </div>
        </div>
      </div>

      {/* Other Cabinets Carousel */}
      <div style={{ marginTop: '40px' }}>
        <h4 className="pixel-text" style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '16px' }}>
          CHECK OUT OTHER CABINETS:
        </h4>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {ARCADE_GAMES.filter((g) => g.slug !== slug).map((other) => (
            <Link
              key={other.id}
              href={`/games/${other.slug}`}
              className="arcade-btn"
              style={{
                fontSize: '0.75rem',
                borderColor: other.accentColor,
                color: other.accentColor
              }}
            >
              {other.icon} {other.title} &rarr;
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
