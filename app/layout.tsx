import type { Metadata } from 'next';
import './globals.css';
import { TicketProvider } from '@/context/TicketContext';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Retro Arcade | Prototyping for Masters 2026',
  description: 'A retro arcade platform with classic mini-games, ticket wallet, and prize counter.',
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
                Collaborative team arcade project. Build on your game branch, merge PRs, and win prizes!
              </p>
            </footer>
          </div>
        </TicketProvider>
      </body>
    </html>
  );
}
