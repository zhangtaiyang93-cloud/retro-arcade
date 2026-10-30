'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useTickets } from '@/context/TicketContext';

interface PrizeItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
  category: string;
  description: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  rarityColor: string;
}

const PRIZES: PrizeItem[] = [
  {
    id: 'prize-sticker',
    name: 'Retro Pixel Sticker Pack',
    cost: 10,
    icon: '👾',
    category: 'Swag',
    description: 'Holographic pixel stickers to decorate your laptop and cabinet.',
    rarity: 'Common',
    rarityColor: '#00f0ff'
  },
  {
    id: 'prize-keychain',
    name: 'Neon Glowstick Keychain',
    cost: 25,
    icon: '🔑',
    category: 'Accessories',
    description: 'A glowing acrylic keychain shaped like an 8-bit arcade joystick.',
    rarity: 'Common',
    rarityColor: '#39ff14'
  },
  {
    id: 'prize-plush',
    name: 'Plush Space Alien Mascot',
    cost: 50,
    icon: '🛸',
    category: 'Plushies',
    description: 'Ultra-soft alien plushie with squishy tentacles and stitched eyes.',
    rarity: 'Uncommon',
    rarityColor: '#bc13fe'
  },
  {
    id: 'prize-shades',
    name: '80s Synthwave Neon Shades',
    cost: 100,
    icon: '🕶️',
    category: 'Wearables',
    description: 'Fluorescent shutter shades that glow brilliantly under blacklight.',
    rarity: 'Rare',
    rarityColor: '#ff007f'
  },
  {
    id: 'prize-handheld',
    name: 'Mini Retro Handheld Console',
    cost: 250,
    icon: '🕹️',
    category: 'Tech',
    description: 'Pocket-sized emulator console packed with 100+ 8-bit nostalgia games.',
    rarity: 'Rare',
    rarityColor: '#ffe600'
  },
  {
    id: 'prize-trophy',
    name: 'Golden Arcade Master Trophy',
    cost: 500,
    icon: '🏆',
    category: 'Grand Prize',
    description: 'The crowning glory! Engraved 24K gold-plated arcade championship trophy.',
    rarity: 'Legendary',
    rarityColor: '#ffd700'
  }
];

const SHELF_STORAGE_KEY = 'retro_arcade_won_prizes';

export default function PrizeShopPage() {
  const { tickets, spendTickets, addTickets } = useTickets();
  const [wonPrizes, setWonPrizes] = useState<string[]>([]);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Load prize shelf from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHELF_STORAGE_KEY);
      if (stored) {
        setWonPrizes(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleBuy = (prize: PrizeItem) => {
    const success = spendTickets(prize.cost, prize.name);
    if (success) {
      // Trigger celebratory confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      const updated = [...wonPrizes, prize.name];
      setWonPrizes(updated);
      try {
        localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      setPurchaseSuccess(`🎉 Redeemed "${prize.name}" for ${prize.cost} tickets!`);
      setTimeout(() => setPurchaseSuccess(null), 4000);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Top Banner */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div className="pixel-text glow-pink" style={{ fontSize: '0.85rem', color: '#ff007f', marginBottom: '8px' }}>
          ★ ★ ★ REDEMPTION COUNTER ★ ★ ★
        </div>
        <h2
          className="pixel-text glow-yellow"
          style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
            color: '#ffe600',
            marginBottom: '14px'
          }}
        >
          ARCADE PRIZE SHOP
        </h2>
        <p style={{ color: '#a0aec0', maxWidth: '640px', margin: '0 auto 20px', fontSize: '1.2rem' }}>
          Spend the hard-earned tickets from your arcade victories here. Limited stock, claim before they sell out!
        </p>

        {/* Big Balance Banner */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px',
            background: '#15152a',
            border: '3px solid #ffe600',
            borderRadius: '8px',
            padding: '12px 28px',
            boxShadow: '0 0 20px rgba(255, 230, 0, 0.3)'
          }}
        >
          <span style={{ fontSize: '2rem' }}>🎟️</span>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.8rem', color: '#718096', display: 'block' }}>YOUR CURRENT WALLET</span>
            <span className="pixel-text glow-yellow" style={{ fontSize: '1.4rem', color: '#ffe600' }}>
              {tickets} TICKETS
            </span>
          </div>
          <button
            onClick={() => addTickets(20, 'Prize Counter Sample')}
            className="arcade-btn"
            style={{ fontSize: '0.7rem', padding: '6px 10px', marginLeft: '12px' }}
          >
            +20 DEMO TICKETS
          </button>
        </div>

        {/* Purchase alert message */}
        {purchaseSuccess && (
          <div
            className="pixel-text"
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#0d2818',
              border: '2px solid #39ff14',
              color: '#39ff14',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: '0.8rem'
            }}
          >
            {purchaseSuccess}
          </div>
        )}
      </div>

      {/* Prizes Grid */}
      <section style={{ marginBottom: '60px' }}>
        <h3 className="pixel-text glow-cyan" style={{ fontSize: '1.1rem', color: '#00f0ff', marginBottom: '20px' }}>
          🎁 AVAILABLE REWARDS
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}
        >
          {PRIZES.map((prize) => {
            const canAfford = tickets >= prize.cost;
            return (
              <div
                key={prize.id}
                className="cabinet-frame"
                style={{
                  borderColor: prize.rarityColor,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Prize Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '3rem' }}>{prize.icon}</span>
                  <span
                    className="pixel-text"
                    style={{
                      fontSize: '0.65rem',
                      color: prize.rarityColor,
                      border: `1px solid ${prize.rarityColor}`,
                      padding: '3px 8px',
                      borderRadius: '3px'
                    }}
                  >
                    {prize.rarity}
                  </span>
                </div>

                <div>
                  <h4 className="pixel-text" style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '6px' }}>
                    {prize.name}
                  </h4>
                  <p style={{ color: '#8892b0', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {prize.description}
                  </p>
                </div>

                {/* Price and Action */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="ticket-badge" style={{ padding: '4px 10px' }}>
                    <span>{prize.cost}</span>
                    <span style={{ fontSize: '0.7rem' }}>🎟️</span>
                  </div>

                  <button
                    disabled={!canAfford}
                    onClick={() => handleBuy(prize)}
                    className={`arcade-btn ${
                      canAfford ? 'arcade-btn-pink' : 'arcade-btn-disabled'
                    }`}
                    style={{ fontSize: '0.75rem', padding: '8px 16px' }}
                  >
                    {canAfford ? 'REDEEM' : 'NEED MORE 🎟️'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Prize Shelf (Trophies & Won Prizes) */}
      <section
        style={{
          background: '#121224',
          border: '2px solid #bc13fe',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 0 20px rgba(188, 19, 254, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🏆</span>
            <h3 className="pixel-text glow-pink" style={{ fontSize: '1rem', color: '#ff007f', margin: 0 }}>
              YOUR PRIZE SHELF ({wonPrizes.length})
            </h3>
          </div>
          {wonPrizes.length > 0 && (
            <button
              onClick={() => {
                setWonPrizes([]);
                localStorage.removeItem(SHELF_STORAGE_KEY);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666b88',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Clear shelf
            </button>
          )}
        </div>

        {wonPrizes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#718096' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Your shelf is currently empty!</p>
            <p style={{ fontSize: '0.95rem' }}>
              Play arcade cabinets on the floor to rack up tickets and redeem prizes above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {wonPrizes.map((item, idx) => (
              <div
                key={idx}
                className="pixel-text"
                style={{
                  background: '#1b1b36',
                  border: '2px solid #00f0ff',
                  color: '#00f0ff',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>✨</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
