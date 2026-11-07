'use client';

import Link from 'next/link';
import type { ArcadeGame } from '@/lib/games';

export default function GameCard({ game, onEnter }: { game: ArcadeGame; onEnter?: () => void }) {
  return <article className="cabinet-frame hall-game-card" style={{ borderColor: game.accentColor, boxShadow: `0 10px 30px #000c, 0 0 25px ${game.accentColor}33` }}>
    <div className="hall-card-marquee" style={{ background: game.cabinetColor, borderColor: game.accentColor }}>
      <span className="hall-card-icon" aria-hidden="true">{game.icon}</span>
      <div><h3 className="pixel-text">{game.title}</h3><span style={{ color: game.accentColor }}>{game.genre}</span></div>
      <span className="hall-card-status pixel-text" style={{ color: game.accentColor, borderColor: game.accentColor }}>{game.status}</span>
    </div>
    <div className="hall-card-body">
      <div className="crt-screen"><p className="hall-card-tagline">&ldquo;{game.tagline}&rdquo;</p><p>{game.description}</p></div>
      <dl className="hall-card-specs">
        <div><dt>Teammate</dt><dd>{game.author}</dd></div>
        <div><dt>Ticket Rewards</dt><dd className="glow-yellow">{game.ticketReward}</dd></div>
        <div><dt>Controls</dt><dd>{game.controlsTip}</dd></div>
      </dl>
      <Link href={`/games/${game.slug}`} onClick={onEnter} className="arcade-btn hall-start" style={{ borderColor: game.accentColor, color: game.accentColor }}>
        {game.slug === 'neon-slots' ? 'ENTER NEON LUCK →' : 'START GAME →'}
      </Link>
      <p className="hall-entry-note">{game.slug === 'neon-slots' ? 'Opening the cabinet is free. 50 tickets are charged only when you spin.' : 'Free to play. Your earned tickets go straight to your wallet.'}</p>
    </div>
    <div className="hall-card-foot"><span>{game.slug === 'neon-slots' ? '[ 50 TICKETS / SPIN ]' : '[ FREE PLAY ]'}</span><span>STATUS: STANDBY</span></div>
  </article>;
}
