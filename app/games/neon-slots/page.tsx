import Link from 'next/link';
import NeonSlots from '@/components/games/NeonSlots';

export default function NeonSlotsPage() {
  return <div style={{ maxWidth: 960, margin: '20px auto', padding: '0 16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      <Link href="/" className="arcade-btn" style={{ fontSize: '.65rem', padding: '10px 12px' }}>← BACK TO FLOOR</Link>
      <Link href="/prizes" className="arcade-btn arcade-btn-yellow" style={{ fontSize: '.65rem', padding: '10px 12px' }}>🎁 REDEEM PRIZES →</Link>
    </div>
    <div className="cabinet-frame" style={{ borderColor: '#ffe600', boxShadow: '0 15px 45px #000, 0 0 30px #ffe60022', marginBottom: 30, transform: 'none' }}>
      <div style={{ background: 'linear-gradient(90deg,#27182a,#201420,#27182a)', borderBottom: '4px solid #ff007f', padding: '24px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.3rem', marginBottom: 10 }}>🎰</div>
        <h2 className="pixel-text glow-yellow" style={{ fontSize: 'clamp(1.2rem,4vw,2.1rem)', color: '#ffe600', lineHeight: 1.5 }}>NEON LUCK</h2>
        <p className="pixel-text" style={{ fontSize: '.6rem', color: '#ff68ad', marginTop: 10, lineHeight: 1.8 }}>BY RUBY PANN · HIGH-STAKES ARCADE</p>
      </div>
      <NeonSlots />
    </div>
  </div>;
}
