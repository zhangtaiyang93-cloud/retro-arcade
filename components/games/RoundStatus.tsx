export default function RoundStatus({ seconds, banked, active, onFinish, rules }: { seconds?: number; banked: number; active: boolean; onFinish?: () => void; rules: string }) {
  return <div style={{ border: '1px solid #00f0ff66', background: '#0a101c', padding: '12px 14px', marginBottom: 14, textAlign: 'left' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, alignItems: 'center', justifyContent: 'space-between' }}>
      <strong className="pixel-text" style={{ fontSize: '.65rem', color: '#00f0ff', lineHeight: 1.8 }}>{seconds === undefined ? 'ENDLESS SURVIVAL' : 'TIME ' + Math.floor(seconds / 60).toString().padStart(2,'0') + ':' + (seconds % 60).toString().padStart(2,'0')}</strong>
      <span style={{ color: '#ffe600' }}>BANKED: {banked} 🎟️</span>
      {onFinish && <button className="arcade-btn" style={{ fontSize: '.55rem', padding: '8px 10px' }} disabled={!active} onClick={onFinish}>END ROUND</button>}
    </div>
    <p style={{ color: '#a0aec0', fontSize: '1rem', marginTop: 6 }}>{rules} Free entry. Tickets bank live, up to 2/sec; banked tickets stay yours on exit.</p>
  </div>;
}
