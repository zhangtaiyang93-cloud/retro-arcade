# 🕹️ Retro Arcade

A collaborative retro arcade platform built for the **Prototyping for Masters 2026** class. Teammates collaborate together to build classic arcade games (such as Space Invaders, Pac-Man, Brick Breaker), award tickets to players, and redeem prizes in the Prize Shop!

---

## ⚡ Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zhangtaiyang93-cloud/retro-arcade.git
   cd retro-arcade
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the local dev server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Where Everything Lives (Shared File Map)

Here is where each shared foundational piece lives so teammates know exactly where to look:

| Feature | File Path | Description |
| :--- | :--- | :--- |
| **🎮 Games Registry** | `lib/games.ts` | Shared list of arcade games with titles, routes, authors, ticket rewards, and tags. Edit here to claim or configure your game! |
| **🎟️ Ticket Wallet** | `context/TicketContext.tsx` | Global state and `localStorage` persistence. Provides `useTickets()` with `tickets`, `addTickets(amount)`, `spendTickets(amount)`, and `resetTickets()`. |
| **⚡ Global Navigation & Marquee** | `components/Header.tsx` | Shared header on all pages showing live ticket count, wallet tools dropdown, and floor navigation. |
| **👾 Arcade Floor (Home)** | `app/page.tsx` | Neon arcade room floor displaying all game cabinets reading from `lib/games.ts`. |
| **🕹️ Game Cabinets** | `app/games/[slug]/page.tsx` | Individual arcade cabinet pages. Teammates build their mini-game canvas/components here! |
| **🎁 Prize Counter & Shelf** | `app/prizes/page.tsx` | Prize shop with affordance checks (Buy disabled when balance is low), confetti animations, and personal trophy shelf. |
| **🎨 Retro CRT & Neon Styles** | `app/globals.css` | Google fonts (`Press Start 2P`, `VT323`), CRT scanlines, neon text glows, and cabinet styles. |

---

## 🚀 How to Build Your Game (Teammate Guide)

### 1. Work on a dedicated branch
Never push directly to `main`! Create a branch named after the feature or game you are creating:
```bash
git checkout -b feature/your-game-name
```

### 2. Connect to the Ticket Wallet
In your game component or page, import the ticket hook:
```typescript
import { useTickets } from '@/context/TicketContext';

export default function MyGame() {
  const { addTickets } = useTickets();

  const handleGameOver = (finalScore: number) => {
    // Award 1 ticket per 100 points
    const ticketsEarned = Math.floor(finalScore / 100);
    if (ticketsEarned > 0) {
      addTickets(ticketsEarned, 'Game Victory!');
    }
  };
  ...
}
```

### 3. Test Edge Cases Before Opening a PR
* **Ticket Spending:** Confirm you cannot buy prizes if your ticket count is less than the price. The wallet should never go below 0.
* **Wallet Persistence:** Reload the browser page — your ticket count and won prizes should persist.
* **Responsive Layout:** Check that your game cabinet scales nicely on laptops and different screen sizes.

### 4. Push & Open Pull Request
```bash
git add .
git commit -m "feat: implement gameplay mechanics"
git push origin feature/your-game-name
```
Open a Pull Request on GitHub and request a review from your team!

---

## 👥 Adding Collaborators (Owner Step)
1. Go to repository **Settings** &rarr; **Collaborators**.
2. Click **Add people** and invite your teammates.
3. Also invite instructor Elizabeth: `elizabethylin@gmail.com`.

## Space Invaders

Implemented on `caoyunxu/space-invaders`. Open `/games/space-invaders`.
Use Left/Right or A/D to move, hold Space to fire, and P/Escape to pause.
Touch controls are available below the playfield. Leaving the browser pauses the game.
Clear three waves to earn 10, 20, then 30 tickets (60 total), awarded immediately
through the shared wallet once per wave. Losing or replaying never re-awards an old wave.

Run engine regression checks with `node tests/space-invaders.cjs`.
