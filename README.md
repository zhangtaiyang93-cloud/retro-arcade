# Retro Arcade / Before Closing — interactive hall

Use Node.js 24. Run `npm ci`, then `npm run dev`. Open http://localhost:3000.

Run `npm test` and `npm run build` before review. See [DEPLOYMENT.md](DEPLOYMENT.md)
for the owner review, Vercel connection and production release steps.

## The arcade floor

The approved pixel hall is the new home page. Walk with A/D or left/right arrows;
hold the on-screen arrows on touch devices. Only clicking the floor moves you.
Walk close to a cabinet or counter, then click it or press E. Distant object
clicks only explain that you need to get closer; they never start walking.
A cabinet first opens its original-style information card. START GAME confirms
entry; opening a card is always free. Returning to the hall restores your position.
The counter opens the existing prize shop in a dialog and updates the hall shelf.
Escape or the close button returns to the hall without entering a game.

Four ordinary props conceal one-time tickets: stool (8), trash can (10), snack
machine (12), and boxes (10). Props look normal until examined. Each discovery
plays a 1.8-second reaction, then banks the reward and opens its result dialog.
The trash can includes a raccoon peek. After collection the prop has no hover
highlight, tooltip, click action, E target or keyboard-focus button. Refreshing
or returning from a minigame preserves this lockout. Leaving during the animation cancels it without
consuming the pickup; it can be tried again. Balance and claimed pickups share
one authoritative localStorage snapshot, migrated from the existing wallet.

Scene lighting varies between 34% and 100% of the approved artwork's brightness.
Each cycle chooses fresh random delays, depths and recovery steps, with brief
contact faults and occasional longer brownouts. The frame, controls, wallet,
prompts and dialogs stay steady. Painted tube cores darken more deeply than the
room, while their surrounding wall glow fades on the same fault sequence. The
fixture housings retain their normal shading rather than turning into black bars.
LIGHTS toggles the effect; reduced-motion preferences default to steady lighting.
The renderer uses the provided 8-frame walk sheet and a separate planted-foot
idle sprite, both enlarged to 150% of the first hall implementation. The walking
lane is at world y=590. Foreground masks preserve the visible floor gaps between
cabinets. Perimeters were reviewed against enlarged artwork, including cabinet
side panels. No texture-edge auto-snapping or rotated background copy is used.
The camera follows on narrower screens. Hover highlights stay inside the object;
mouse hover shows a compact yellow name/action tooltip, with no hidden loot spoilers.

Hall geometry, proximity, pickup rewards and duration live in `lib/hall.ts`.
Object silhouettes, foreground masks, floor-only hit testing and randomized
light cycles live in `lib/hall-visuals.ts`. Pointer hit tests use the same
silhouettes as the visual effect, including the gaps between the stool legs.
Art lives in `public/art/`. The persistent countdown is shared by the hall,
all cabinet routes, the opening flow and the ending system described below.

## Implemented rules

Ordinary cabinets are free. New nights explicitly start with 0 tickets; existing
in-progress nights resume their saved wallet and prize collection. Prototype free-ticket buttons have
been removed. Each prize can be collected once. Prize prices total 935.

| Cabinet | Mode | Achievement tickets before the rate ceiling |
| --- | --- | --- |
| Super Neon Plumber | 90 seconds | coins + floor(score/160) + 20 for flagpole; map maximum 62 |
| Brick Breaker | 120 seconds | cleared bricks + floor(score/120) + 20 for full clear; theoretical maximum 99 |
| Chroma Chase | 180 seconds, all 3 levels together | floor(pickups/6), plus 20/25/25 per level, plus 10 per no-damage level; maximum 191 |
| Space Invaders | Endless survival | 1 per alien plus 6/8/10/12/14/16/18 thereafter per wave |
| Cyber Neon Snake | Endless survival | 2 per normal orb and 5 per golden orb |
| Neon Luck — Ruby Pann | 50-ticket spin | See probabilities below |

Tickets bank while playing, at no more than 2 per elapsed second per round.
Score rewards pending above that ceiling are released while the round continues;
unbanked excess is discarded when the round ends. Banked rewards are never
re-awarded at death, clear, timeout, exit or restart. No zero-score death bonus.
Three timed cabinets offer END ROUND; time includes pauses and inactive tabs.
Snake accelerates from 115ms to 55ms per step; its body caps at 180 segments to
leave food-spawn cells. Invaders continue after wave 3, with bounded increasingly
fast movement/fire and safe spawn height on arbitrarily late waves.

A normal single-tab 30-minute play session can bank at most 3,600 ordinary-game
tickets. The four one-time pickups total 40 (8+10+12+10), 4.28% of prize cost.
3,640 is below the hidden-ending target of 9,350. The hallway, pickups,
global 30-minute campaign, opening animation and three endings are integrated.
Simultaneous tabs/client tampering are not secured by this classroom browser-local prototype.

The target for practiced play is roughly 40–80 tickets/min, not a measured human
average. Max rewards alone do not imply equal difficulty. At that pace a 935-ticket
collection takes about 12–24 minutes, before walking/shopping. Playtest and tune
from observed completion rates to tune the 30-minute campaign.

## Slot balance (returns include stake)

| Result | Chance | Return | Net |
| --- | ---: | ---: | ---: |
| No match | 50.05% | 0 | -50 |
| Cherry pair | 30% | 50 | 0 |
| Cherry triple | 15% | 100 | +50 |
| BAR triple | 4% | 200 | +150 |
| Star triple | 0.9% | 500 | +450 |
| Seven triple | 0.05% | 10,000 | +9,950 |

Mean return 47.5 (95%), mean net -2.5, positive net chance 19.95%.
The 1-in-2,000 jackpot is independent, not guaranteed every 2,000 spins.
Stake and return are one persisted transaction before the 2.4-second animation.
No spin count limit. Leaving or reloading cannot duplicate/drop the outcome.

## Checks

- node tests/slots.cjs: exhaustive 10,000 draws, wallet persistence, duplicate click,
  insufficient funds, all-in loss/jackpot, redemption, reset, pickup idempotency,
  wallet migration and matching balance/pickup persistence.
- node tests/hall.cjs: all six cabinet routes and proximity targets, click-to-walk
  arrival, world/camera bounds, manual override, movement speed and pickup budget.
- node tests/economy.cjs: formulas and 30-minute ceiling; true component loops
  for brick early-win regression, timers, live snake pay, zero-score death;
  endless invader waves and maze timeout during pause.
- node tests/space-invaders.cjs: payouts, late waves, collision, pause and restart.
- npm run build: production compilation and type checking.
- node tests/night.cjs: persistent wall-clock deadline, exact ending boundaries,
  timeout precedence, idempotent settlement and invalid-session recovery.
- node tests/chip-audio.cjs: bundled recording integrity, gesture gating, one continuous
  player, volume transitions, independent mute, suspension/resume and late-play races.

## Before Closing: opening, campaign and endings

START plays four subtitled pixel scenes: last customer at 23:30, empty pockets,
six prizes costing 935, and the goal to collect them and leave before closing.
The clock starts only on ENTER ARCADE; the intro can be skipped to the goal.
Games, shopping, pauses, background tabs and refreshes share a saved deadline.
At zero, all cabinet rewards stop and the closing ending takes over any route.

Leave via the entrance door or the persistent EXIT button. A confirmation
settles the run: all six redeemed prizes before the deadline gives COMPLETE;
otherwise CLOSING. The OWNER secret ending takes priority when leaving before
the deadline with at least 9,350 held tickets and positive net slot winnings.
The owner sequence shows a jackpot, key handover, exit and a changed sign.
Each ending includes a saved report; a new night explicitly resets tickets,
prizes, pickups and hall position together. The prior wallet is backed up locally.

All player-facing text is English. Music is Eric Skiff’s human-composed
“Underclocked (underunderclocked mix)” from Resistor Anthems, downloaded directly
from https://ericskiff.com/music/ under CC BY 4.0. The unchanged MP3 and full
credit/source details are bundled in public/audio/. Attribution is visible on
the title, films and game footer. CC BY 4.0 allows noncommercial and commercial
use with attribution; it is not an NC-only license.

A single persistent recording continues across scenes and game routes. The
recording loops without layering or restarting on navigation. Volume fades to
20% during the intro, 22% in the hall, 13% during games, 12% at closing and 18%
at the other endings. The former synthesized music scheduler is removed. Short
8-bit interface effects remain, with reduced volume. Music and effects have
independent persisted controls. Click START to unlock browser audio. Hidden
tabs suspend audio while the campaign clock continues.

`/storyboard` is an author-facing screening room with synthetic results. It can
preview all four films without awarding or spending tickets. A real active
campaign still counts down while watching a preview. The normal game does not
advertise this route, so the secret ending is not spoiled in the player flow.

## Team workflow

Clone the team repository and work on a feature branch. Request owner review in
a Pull Request before merging. Production releases follow the configured `main`
branch through Vercel; approving a PR alone does not merge or deploy it.

### Hall layering and discovery animations

Cabinet boundaries include the full side panels; foreground masks keep the gaps between silhouettes clear. Intervening stools, boxes, and the snack cart mask cabinet highlights. Static inset strokes replace rotated background copies and jittery texture-edge traces.

Each pickup has a distinct 1.8-second scene: a lifting bin lid and raccoon, opening cardboard flaps, a shaking vending machine with returned tickets, and a stool with a ticket stuck to stretching gum. The character briefly steps aside during the interaction so the animation remains visible. Collected locations become non-interactive for the current saved run; wallet awards remain one-time only (8 + 10 + 12 + 10 = 40 tickets). Reduced-motion mode shows a still reveal for the same duration.
