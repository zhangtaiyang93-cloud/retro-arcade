'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTickets } from '@/context/TicketContext';

export default function Header() {
  const pathname = usePathname();
  const { tickets, addTickets, resetTickets, lastTransactionMessage } = useTickets();
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  return (
    <header className="arcade-marquee sticky top-0 z-50">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Arcade Brand Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.8rem' }}>🕹️</span>
          <div>
            <h1 className="pixel-text glow-pink" style={{ fontSize: '1.15rem', color: '#ff007f', margin: 0, textTransform: 'uppercase' }}>
              RETRO ARCADE
            </h1>
            <span style={{ fontSize: '0.9rem', color: '#00f0ff', letterSpacing: '0.15em' }}>
              PROTOTYPING 2026
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            href="/"
            className={`arcade-btn ${pathname === '/' ? 'arcade-btn-pink' : ''}`}
            style={{ fontSize: '0.75rem', padding: '8px 14px' }}
          >
            👾 FLOOR
          </Link>
          <Link
            href="/prizes"
            className={`arcade-btn ${pathname === '/prizes' ? 'arcade-btn-yellow' : ''}`}
            style={{ fontSize: '0.75rem', padding: '8px 14px' }}
          >
            🎁 PRIZES
          </Link>
        </nav>

        {/* Live Ticket Wallet */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowWalletMenu(!showWalletMenu)}
            className="ticket-badge"
            title="Click to manage tickets or test wallet"
            style={{ cursor: 'pointer', background: 'transparent' }}
          >
            <span>🎟️</span>
            <span className="pixel-text glow-yellow">{tickets}</span>
            <span style={{ fontSize: '0.7rem', color: '#ffe600', opacity: 0.8 }}>TICKETS</span>
            <span style={{ fontSize: '0.65rem' }}>▼</span>
          </button>

          {/* Quick Wallet Dropdown */}
          {showWalletMenu && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#121224',
                border: '2px solid #ffe600',
                borderRadius: '6px',
                padding: '12px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.8), 0 0 15px rgba(255, 230, 0, 0.3)',
                width: '230px',
                zIndex: 100
              }}
            >
              <div className="pixel-text" style={{ fontSize: '0.65rem', color: '#ffe600', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '6px' }}>
                TICKET WALLET TOOLS
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>
                Balance: <strong style={{ color: '#fff' }}>{tickets} 🎟️</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    addTickets(10, 'Bonus Cheat Code');
                    setShowWalletMenu(false);
                  }}
                  className="arcade-btn"
                  style={{ fontSize: '0.65rem', padding: '6px 8px', width: '100%' }}
                >
                  +10 FREE TICKETS
                </button>
                <button
                  onClick={() => {
                    resetTickets();
                    setShowWalletMenu(false);
                  }}
                  className="arcade-btn arcade-btn-pink"
                  style={{ fontSize: '0.65rem', padding: '6px 8px', width: '100%' }}
                >
                  RESET WALLET (25)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Transaction Notification */}
      {lastTransactionMessage && (
        <div
          style={{
            background: 'linear-gradient(90deg, #ff007f, #bc13fe)',
            color: '#fff',
            textAlign: 'center',
            padding: '5px 12px',
            fontFamily: 'var(--font-pixel)',
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}
        >
          {lastTransactionMessage}
        </div>
      )}
    </header>
  );
}
