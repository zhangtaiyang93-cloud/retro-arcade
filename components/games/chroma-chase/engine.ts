// Game rules with no React, canvas or audio. The UI advances it with step() and reacts to drainEvents().

import { GAME, LEVELS, SCORE } from './config';
import {
  COLS,
  DEN_CENTER,
  DEN_EXIT,
  ORB_START,
  ROWS,
  distanceField,
  isOpen,
  isWall,
  nearestOpenTile,
  openTiles,
  tileAt,
  tileIndex,
  wrapCol
} from './maze';

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Status = 'title' | 'ready' | 'playing' | 'paused' | 'hit' | 'levelclear' | 'gameover' | 'victory';
export type CreatureId = 'lancer' | 'warden' | 'glitchling' | 'mirrorcoil';
export type CreatureMode = 'den' | 'leaving' | 'active' | 'returning';

export const DIRS: Dir[] = ['up', 'left', 'down', 'right'];
export const VECTORS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export type GameEvent =
  | { type: 'particle'; x: number; y: number }
  | { type: 'core'; x: number; y: number }
  | { type: 'caught'; x: number; y: number; id: CreatureId; points: number }
  | { type: 'hit'; x: number; y: number }
  | { type: 'blink'; fromX: number; fromY: number; x: number; y: number }
  | { type: 'go' }
  | { type: 'levelClear'; level: number; noDamage: boolean }
  | { type: 'victory' }
  | { type: 'gameOver' };

export interface Actor {
  col: number;
  row: number;
  dir: Dir | null;
  /** Progress from this tile to the next, from 0 to 1. */
  t: number;
}

export interface Creature extends Actor {
  id: CreatureId;
  mode: CreatureMode;
  vulnerable: boolean;
  releaseAt: number;
  blinkAt: number;
  charging: boolean;
  home: { col: number; row: number };
}

const CREATURE_SETUP: Array<{ id: CreatureId; col: number; home: { col: number; row: number } }> = [
  { id: 'lancer', col: 9, home: { col: 17, row: 1 } },
  { id: 'warden', col: 8, home: { col: 1, row: 1 } },
  { id: 'glitchling', col: 10, home: { col: 17, row: 19 } },
  { id: 'mirrorcoil', col: 7, home: { col: 1, row: 19 } }
];

export const positionOf = (actor: Actor) => {
  const v = actor.dir ? VECTORS[actor.dir] : { dx: 0, dy: 0 };
  return { x: actor.col + v.dx * actor.t, y: actor.row + v.dy * actor.t };
};

export class ChromaChaseGame {
  status: Status = 'title';
  score = 0;
  lives: number = GAME.startingLives;
  /** Zero-based index into LEVELS. */
  level = 0;
  /** Seconds left on the current countdown, hit or level-clear screen. */
  timer = 0;
  surgeLeft = 0;
  invulnerableLeft = 0;
  noDamage = true;
  time = 0;
  orb: Actor = { col: ORB_START.col, row: ORB_START.row, dir: null, t: 0 };
  wanted: Dir | null = null;
  creatures: Creature[] = [];
  /** 1 for a particle and 2 for a core, by tile index. */
  pickups = new Uint8Array(COLS * ROWS);
  remaining = 0;

  private surgeChain = 0;
  private pausedFrom: Status = 'playing';
  private events: GameEvent[] = [];

  constructor(private rng: () => number = Math.random) {
    this.fillPickups();
    this.resetActors();
  }

  get config() {
    return LEVELS[this.level];
  }

  start() {
    if (this.status !== 'title') return;
    this.status = 'ready';
    this.timer = GAME.countdownSeconds;
  }

  togglePause() {
    if (this.status === 'playing' || this.status === 'ready') {
      this.pausedFrom = this.status;
      this.status = 'paused';
    } else if (this.status === 'paused') {
      this.status = this.pausedFrom;
    }
  }

  /** Remembers the turn until the orb reaches a tile where it can take it. */
  steer(dir: Dir) {
    this.wanted = dir;
  }

  drainEvents(): GameEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  step(dt: number) {
    switch (this.status) {
      case 'ready':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.status = 'playing';
          this.events.push({ type: 'go' });
        }
        break;
      case 'playing':
        this.stepPlaying(dt);
        break;
      case 'hit':
        this.timer -= dt;
        if (this.timer <= 0) this.afterHit();
        break;
      case 'levelclear':
        this.timer -= dt;
        if (this.timer <= 0) this.nextLevel();
        break;
    }
  }

  /** Test helper: collects everything so the next playing step clears the level. */
  debugCollectAll() {
    this.pickups.fill(0);
    this.remaining = 0;
  }

  private fillPickups() {
    this.pickups.fill(0);
    this.remaining = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = tileAt(col, row);
        if (tile === '.' || tile === 'o') {
          this.pickups[tileIndex(col, row)] = tile === 'o' ? 2 : 1;
          this.remaining++;
        }
      }
    }
  }

  private resetActors() {
    this.orb = { col: ORB_START.col, row: ORB_START.row, dir: null, t: 0 };
    this.wanted = null;
    this.surgeLeft = 0;
    this.surgeChain = 0;
    this.creatures = CREATURE_SETUP.map((setup, index) => ({
      id: setup.id,
      col: setup.col,
      row: DEN_CENTER.row,
      dir: null,
      t: 0,
      mode: 'den',
      vulnerable: false,
      releaseAt: this.time + 0.2 + index * this.config.releaseInterval,
      blinkAt: this.time + GAME.glitchlingBlinkEvery,
      charging: false,
      home: setup.home
    }));
  }

  private stepPlaying(dt: number) {
    this.time += dt;
    this.invulnerableLeft = Math.max(0, this.invulnerableLeft - dt);
    this.stepOrb(dt);
    this.collectAtOrb();

    // A clear beats a collision in the same step, so the last particle always counts.
    if (this.remaining === 0) {
      this.clearLevel();
      return;
    }

    if (this.surgeLeft > 0) {
      this.surgeLeft -= dt;
      if (this.surgeLeft <= 0) {
        this.surgeLeft = 0;
        for (const creature of this.creatures) creature.vulnerable = false;
      }
    }

    for (const creature of this.creatures) this.stepCreature(creature, dt);
    this.checkTouches();
  }

  private stepOrb(dt: number) {
    const { orb, wanted } = this;
    if (wanted && orb.dir && wanted === OPPOSITE[orb.dir] && orb.t > 0) reverse(orb);
    move(orb, GAME.orbSpeed * dt, () => this.chooseOrbDir());
  }

  private chooseOrbDir(): Dir | null {
    const { orb, wanted } = this;
    if (wanted && this.orbCanEnter(orb, wanted)) return wanted;
    if (orb.dir && this.orbCanEnter(orb, orb.dir)) return orb.dir;
    return null;
  }

  private orbCanEnter(actor: Actor, dir: Dir) {
    const v = VECTORS[dir];
    return isOpen(actor.col + v.dx, actor.row + v.dy);
  }

  private collectAtOrb() {
    const { x, y } = positionOf(this.orb);
    const col = wrapCol(Math.round(x));
    const row = Math.round(y);
    const index = tileIndex(col, row);
    const pickup = this.pickups[index];
    if (!pickup) return;
    this.pickups[index] = 0;
    this.remaining--;
    if (pickup === 1) {
      this.score += SCORE.particle;
      this.events.push({ type: 'particle', x: col, y: row });
    } else {
      this.score += SCORE.core;
      this.startSurge();
      this.events.push({ type: 'core', x: col, y: row });
    }
  }

  private startSurge() {
    this.surgeLeft = this.config.surgeSeconds;
    this.surgeChain = 0;
    for (const creature of this.creatures) {
      if (creature.mode === 'returning') continue;
      creature.vulnerable = true;
      if (creature.mode === 'active' && creature.dir && creature.t > 0) reverse(creature);
    }
  }

  private stepCreature(creature: Creature, dt: number) {
    if (creature.mode === 'den') {
      if (this.time >= creature.releaseAt) creature.mode = 'leaving';
      else return;
    }
    if (creature.id === 'glitchling') this.maybeBlink(creature);
    creature.charging = creature.id === 'lancer' && this.lancerSeesOrb(creature);
    move(creature, this.creatureSpeed(creature) * dt, () => this.chooseCreatureDir(creature));
  }

  private creatureSpeed(creature: Creature) {
    if (creature.mode === 'returning') return GAME.returningSpeed;
    let speed = GAME.orbSpeed * this.config.creatureSpeed;
    if (creature.vulnerable) speed *= GAME.vulnerableSpeedFactor;
    else if (creature.charging) speed *= GAME.lancerChargeFactor;
    return speed;
  }

  private lancerSeesOrb(creature: Creature) {
    if (creature.mode !== 'active' || creature.vulnerable) return false;
    const { col, row } = this.orb;
    if (col !== creature.col && row !== creature.row) return false;
    const distance = Math.abs(col - creature.col) + Math.abs(row - creature.row);
    if (distance > GAME.lancerSightTiles) return false;
    const stepX = Math.sign(col - creature.col);
    const stepY = Math.sign(row - creature.row);
    for (let i = 1; i < distance; i++) {
      if (isWall(creature.col + stepX * i, creature.row + stepY * i)) return false;
    }
    return true;
  }

  private maybeBlink(creature: Creature) {
    if (creature.mode !== 'active' || this.time < creature.blinkAt) return;
    if (creature.vulnerable) {
      creature.blinkAt = this.time + GAME.glitchlingBlinkEvery / 2;
      return;
    }
    const fromOrb = distanceField(wrapCol(this.orb.col), this.orb.row, false);
    const options = openTiles().filter((tile) => fromOrb[tileIndex(tile.col, tile.row)] >= GAME.glitchlingMinBlinkDistance);
    creature.blinkAt = this.time + GAME.glitchlingBlinkEvery * (0.85 + this.rng() * 0.3);
    if (!options.length) return;
    const tile = options[Math.floor(this.rng() * options.length)];
    const from = positionOf(creature);
    creature.col = tile.col;
    creature.row = tile.row;
    creature.dir = null;
    creature.t = 0;
    this.events.push({ type: 'blink', fromX: from.x, fromY: from.y, x: tile.col, y: tile.row });
  }

  private chooseCreatureDir(creature: Creature): Dir | null {
    if (creature.mode === 'leaving' && creature.col === DEN_EXIT.col && creature.row === DEN_EXIT.row) {
      creature.mode = 'active';
    }
    if (creature.mode === 'returning' && creature.col === DEN_CENTER.col && creature.row === DEN_CENTER.row) {
      creature.mode = 'den';
      creature.vulnerable = false;
      creature.dir = null;
      creature.releaseAt = this.time + GAME.respawnSeconds;
      return null;
    }

    if (creature.mode === 'leaving') return this.nearestTo(creature, DEN_EXIT.col, DEN_EXIT.row, true, true);
    if (creature.mode === 'returning') return this.nearestTo(creature, DEN_CENTER.col, DEN_CENTER.row, true, true);
    if (creature.vulnerable) return this.farthestFromOrb(creature);

    if (creature.id === 'glitchling' && this.rng() > 0.35) {
      const options = this.forwardOptions(creature, false);
      return options[Math.floor(this.rng() * options.length)] ?? null;
    }
    const target = this.targetFor(creature);
    return this.nearestTo(creature, target.col, target.row, false, false);
  }

  /** Each creature's hunting rule. They all head home during the drift phase instead. */
  private targetFor(creature: Creature): { col: number; row: number } {
    const { col, row } = this.orb;
    const orbTile = { col: wrapCol(col), row };
    const { huntSeconds, driftSeconds } = this.config;
    const cycle = this.time % (huntSeconds + driftSeconds);
    if (cycle > huntSeconds) return creature.home;

    switch (creature.id) {
      case 'lancer':
        return orbTile;
      case 'warden':
        return this.wardenTarget(creature, orbTile);
      case 'mirrorcoil': {
        const close = Math.abs(creature.col - col) + Math.abs(creature.row - row) <= GAME.mirrorcoilChaseTiles;
        return close ? orbTile : nearestOpenTile(COLS - 1 - orbTile.col, ROWS - 1 - row);
      }
      default:
        return orbTile;
    }
  }

  /** The Warden guards whichever quarter of the maze has the most energy left. */
  private wardenTarget(creature: Creature, orbTile: { col: number; row: number }) {
    const closeToOrb = Math.abs(creature.col - orbTile.col) + Math.abs(creature.row - orbTile.row) <= GAME.wardenAlertTiles;
    if (closeToOrb) return orbTile;

    const quarters: Array<Array<{ col: number; row: number }>> = [[], [], [], []];
    for (const tile of openTiles()) {
      if (this.pickups[tileIndex(tile.col, tile.row)]) {
        quarters[(tile.col < COLS / 2 ? 0 : 1) + (tile.row < ROWS / 2 ? 0 : 2)].push(tile);
      }
    }
    const fullest = quarters.reduce((a, b) => (b.length > a.length ? b : a));
    if (!fullest.length) return orbTile;
    return fullest[Math.floor(this.time / 3) % fullest.length];
  }

  /** Directions a creature may take, without turning back unless it must. */
  private forwardOptions(creature: Creature, throughDen: boolean): Dir[] {
    const passable = DIRS.filter((dir) => {
      const v = VECTORS[dir];
      const c = creature.col + v.dx;
      const r = creature.row + v.dy;
      return throughDen ? !isWall(c, r) : isOpen(c, r);
    });
    const forward = passable.filter((dir) => !creature.dir || dir !== OPPOSITE[creature.dir]);
    return forward.length ? forward : passable;
  }

  private nearestTo(creature: Creature, col: number, row: number, throughDen: boolean, mayTurnBack: boolean): Dir | null {
    const field = distanceField(col, row, throughDen);
    const options = mayTurnBack
      ? DIRS.filter((dir) => {
          const v = VECTORS[dir];
          const c = creature.col + v.dx;
          const r = creature.row + v.dy;
          return throughDen ? !isWall(c, r) : isOpen(c, r);
        })
      : this.forwardOptions(creature, throughDen);
    return pickByDistance(creature, options, field, 1);
  }

  private farthestFromOrb(creature: Creature): Dir | null {
    const field = distanceField(wrapCol(this.orb.col), this.orb.row, false);
    return pickByDistance(creature, this.forwardOptions(creature, false), field, -1);
  }

  private checkTouches() {
    const orb = positionOf(this.orb);
    for (const creature of this.creatures) {
      if (creature.mode === 'den' || creature.mode === 'returning') continue;
      const { x, y } = positionOf(creature);
      if (Math.hypot(x - orb.x, y - orb.y) >= GAME.touchDistance) continue;

      if (creature.vulnerable) {
        const points = SCORE.firstCreature * 2 ** this.surgeChain;
        this.surgeChain++;
        this.score += points;
        creature.mode = 'returning';
        creature.vulnerable = false;
        this.events.push({ type: 'caught', x, y, id: creature.id, points });
      } else if (this.invulnerableLeft <= 0) {
        this.lives--;
        this.noDamage = false;
        this.status = 'hit';
        this.timer = GAME.hitSeconds;
        this.events.push({ type: 'hit', x: orb.x, y: orb.y });
        return;
      }
    }
  }

  private afterHit() {
    if (this.lives <= 0) {
      this.status = 'gameover';
      this.events.push({ type: 'gameOver' });
      return;
    }
    this.resetActors();
    this.invulnerableLeft = GAME.invulnerableSeconds;
    this.status = 'ready';
    this.timer = GAME.countdownSeconds;
  }

  private clearLevel() {
    this.surgeLeft = 0;
    for (const creature of this.creatures) creature.vulnerable = false;
    this.events.push({ type: 'levelClear', level: this.level, noDamage: this.noDamage });
    if (this.level === LEVELS.length - 1) {
      this.status = 'victory';
      this.events.push({ type: 'victory' });
    } else {
      this.status = 'levelclear';
      this.timer = GAME.levelClearSeconds;
    }
  }

  private nextLevel() {
    this.level++;
    this.noDamage = true;
    this.fillPickups();
    this.resetActors();
    this.status = 'ready';
    this.timer = GAME.countdownSeconds;
  }
}

/** Advances an actor along the grid, asking for a new direction at every tile centre. */
function move(actor: Actor, distance: number, choose: () => Dir | null) {
  let left = distance;
  while (left > 1e-9) {
    if (!actor.dir) {
      actor.dir = choose();
      if (!actor.dir) return;
    }
    const toNext = 1 - actor.t;
    if (left < toNext) {
      actor.t += left;
      return;
    }
    left -= toNext;
    const v = VECTORS[actor.dir];
    actor.col = wrapCol(actor.col + v.dx);
    actor.row += v.dy;
    actor.t = 0;
    actor.dir = choose();
    if (!actor.dir) return;
  }
}

/** Turns back mid-tile by making the tile ahead the new starting point. */
function reverse(actor: Actor) {
  if (!actor.dir) return;
  const v = VECTORS[actor.dir];
  actor.col += v.dx;
  actor.row += v.dy;
  actor.t = 1 - actor.t;
  actor.dir = OPPOSITE[actor.dir];
}

function pickByDistance(actor: Actor, options: Dir[], field: Int16Array, sign: 1 | -1): Dir | null {
  let best: Dir | null = null;
  let bestScore = Infinity;
  for (const dir of options) {
    const v = VECTORS[dir];
    const distance = field[tileIndex(wrapCol(actor.col + v.dx), actor.row + v.dy)];
    if (distance < 0) continue;
    const score = distance * sign;
    if (score < bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return best ?? options[0] ?? null;
}
