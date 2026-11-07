import type { Metadata } from 'next';
import './globals.css';
import { TicketProvider } from '@/context/TicketContext';
import Header from '@/components/Header';
import NightExperience from '@/components/NightExperience';
import MusicPlayer from '@/components/MusicPlayer';
import MusicCredit from '@/components/MusicCredit';

export const metadata: Metadata = {
  title: 'Before Closing | Retro Arcade',
  description: 'Walk through a neon arcade, discover forgotten tickets, play six cabinets and take home prizes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TicketProvider>
          <MusicPlayer />
          <NightExperience>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main style={{ flex: 1, paddingBottom: '60px' }}>
              {children}
            </main>
            <footer
              style={{
                borderTop: '2px solid #1a1a2e',
                background: '#07070d',
                padding: '24px 20px',
                textAlign: 'center',
                color: '#666b88',
                fontSize: '1rem'
              }}
            >
              <div className="pixel-text" style={{ fontSize: '0.7rem', color: '#00f0ff', marginBottom: '8px' }}>
                🕹️ RETRO ARCADE FLOOR &bull; PROTOTYPING FOR MASTERS 2026
              </div>
              <p>
                One last round. Take home something worth staying up for.
              </p>
              <MusicCredit />
            </footer>
          </div>
          </NightExperience>
        </TicketProvider>
      </body>
    </html>
  );
}
