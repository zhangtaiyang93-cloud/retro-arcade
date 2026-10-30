// Draws the game to a canvas. It only reads game state, and owns the purely visual particles and pulses.

import { GAME, LEVELS, PALETTE } from './config';
import { COLS, ROWS, isWall, tileAt, tileIndex } from './maze';
import { ChromaChaseGame, Creature, GameEvent, VECTORS, positionOf } from './engine';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Ring {
  x: number;
  y: number;
  age: number;
  duration: number;
  color: string;
}

const MAX_SPARKS = 320;
const TRAIL_LENGTH = 16;
const CREATURE_COLORS: Record<Creature['id'], string> = {
  lancer: PALETTE.pink,
  warden: PALETTE.cyan,
  glitchling: PALETTE.acid,
  mirrorcoil: PALETTE.violet
};

export class ChromaRenderer {
  reducedMotion = false;

  private ctx: CanvasRenderingContext2D;
  private cell = 20;
  private backdrop: HTMLCanvasElement | null = null;
  private wallPath: Path2D | null = null;
  private backdropLevel = -1;
  private sparks: Spark[] = [];
  private rings: Ring[] = [];
  private trail: Array<{ x: number; y: number }> = [];
  private pulse = 0;
  private distortion = 0;
  private confettiClock = 0;
  private time = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  resize(cssWidth: number, dpr: number) {
    const width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.width = width;
    this.canvas.height = Math.round((width * ROWS) / COLS);
    this.cell = width / COLS;
    this.backdropLevel = -1;
  }

  reset() {
    this.sparks = [];
    this.rings = [];
    this.trail = [];
    this.pulse = 0;
    this.distortion = 0;
  }

  handleEvent(event: GameEvent) {
    switch (event.type) {
      case 'particle':
        this.burst(event.x, event.y, 6, 1.8, [PALETTE.cyan, PALETTE.yellow], 0.35);
        break;
      case 'core':
        this.rings.push({ x: event.x, y: event.y, age: 0, duration: 0.8, color: PALETTE.cyan });
        this.rings.push({ x: event.x, y: event.y, age: -0.12, duration: 0.9, color: PALETTE.pink });
        this.pulse = 1;
        this.burst(event.x, event.y, 18, 4, [PALETTE.pink, PALETTE.cyan, PALETTE.acid], 0.7);
        break;
      case 'caught':
        this.rings.push({ x: event.x, y: event.y, age: 0, duration: 0.45, color: CREATURE_COLORS[event.id] });
        this.burst(event.x, event.y, 22, 5, [CREATURE_COLORS[event.id], '#ffffff'], 0.7);
        break;
      case 'hit':
        this.distortion = 1;
        this.burst(event.x, event.y, 30, 5, [PALETTE.yellow, PALETTE.pink, '#ffffff'], 1);
        this.trail = [];
        break;
      case 'blink':
        this.burst(event.fromX, event.fromY, 12, 3, [PALETTE.acid], 0.4);
        this.burst(event.x, event.y, 12, 3, [PALETTE.acid], 0.4);
        break;
      case 'levelClear':
        this.pulse = 1;
        this.rings.push({ x: COLS / 2 - 0.5, y: ROWS / 2 - 0.5, age: 0, duration: 1.2, color: PALETTE.acid });
        break;
      case 'go':
        this.trail = [];
        break;
    }
  }

  draw(game: ChromaChaseGame, dt: number) {
    this.time += dt;
    this.ensureBackdrop(game.level);
    const { ctx, canvas } = this;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (this.distortion > 0 && !this.reducedMotion) {
      const shake = this.distortion * 3;
      ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    if (this.backdrop) ctx.drawImage(this.backdrop, 0, 0);
    this.drawEnergy(game);
    this.drawPickups(game);
    if (game.status !== 'title') {
      this.drawTrail(game);
      for (const creature of game.creatures) this.drawCreature(game, creature);
      this.drawOrb(game);
    }
    this.updateAndDrawEffects(game, dt);

    if (this.distortion > 0) {
      if (!this.reducedMotion) this.drawDistortion();
      this.distortion = Math.max(0, this.distortion - dt / 0.5);
    }
    this.pulse = Math.max(0, this.pulse - dt / 0.8);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (game.status === 'gameover') {
      ctx.fillStyle = 'rgba(8, 6, 18, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  private center(value: number) {
    return (value + 0.5) * this.cell;
  }

  private ensureBackdrop(level: number) {
    if (this.backdropLevel === level && this.backdrop) return;
    const { canvas, cell } = this;
    const backdrop = document.createElement('canvas');
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    const b = backdrop.getContext('2d') as CanvasRenderingContext2D;

    const glow = b.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.height * 0.7);
    glow.addColorStop(0, PALETTE.deepPurple);
    glow.addColorStop(1, PALETTE.background);
    b.fillStyle = glow;
    b.fillRect(0, 0, canvas.width, canvas.height);

    b.strokeStyle = 'rgba(139, 92, 246, 0.08)';
    b.lineWidth = 1;
    b.beginPath();
    for (let col = 0; col <= COLS; col++) {
      b.moveTo(col * cell, 0);
      b.lineTo(col * cell, canvas.height);
    }
    for (let row = 0; row <= ROWS; row++) {
      b.moveTo(0, row * cell);
      b.lineTo(canvas.width, row * cell);
    }
    b.stroke();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (isWall(col, row)) {
          b.fillStyle = 'rgba(25, 11, 53, 0.9)';
          b.fillRect(col * cell, row * cell, cell + 0.5, cell + 0.5);
        }
      }
    }

    const wallPath = this.buildWallPath();
    const [start, middle, end] = LEVELS[level].theme;
    const gradient = b.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, start);
    gradient.addColorStop(0.5, middle);
    gradient.addColorStop(1, end);

    b.lineCap = 'round';
    b.lineJoin = 'round';
    b.strokeStyle = gradient;
    b.globalAlpha = 0.55;
    b.lineWidth = Math.max(2, cell * 0.18);
    b.shadowColor = middle;
    b.shadowBlur = cell * 0.9;
    b.stroke(wallPath);
    b.shadowBlur = cell * 0.35;
    b.globalAlpha = 1;
    b.lineWidth = Math.max(1.5, cell * 0.09);
    b.stroke(wallPath);
    b.shadowBlur = 0;
    b.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    b.lineWidth = Math.max(0.75, cell * 0.03);
    b.stroke(wallPath);

    // Den door
    b.fillStyle = PALETTE.pink;
    b.shadowColor = PALETTE.pink;
    b.shadowBlur = cell * 0.5;
    b.fillRect(9 * cell + cell * 0.05, 8 * cell + cell * 0.42, cell * 0.9, cell * 0.16);

    this.backdrop = backdrop;
    this.wallPath = wallPath;
    this.backdropLevel = level;
  }

  /** Outlines every wall face that touches open space, inset slightly so corners meet cleanly. */
  private buildWallPath() {
    const { cell } = this;
    const inset = 0.14;
    const path = new Path2D();
    const solid = (col: number, row: number) => {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
      return tileAt(col, row) === '#';
    };
    const sides = [
      { nx: 0, ny: -1, tx: 1, ty: 0 },
      { nx: 0, ny: 1, tx: 1, ty: 0 },
      { nx: -1, ny: 0, tx: 0, ty: 1 },
      { nx: 1, ny: 0, tx: 0, ty: 1 }
    ];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!solid(col, row)) continue;
        for (const { nx, ny, tx, ty } of sides) {
          if (solid(col + nx, row + ny)) continue;
          const reach = (sign: number) => {
            const sideCol = col + tx * sign;
            const sideRow = row + ty * sign;
            if (!solid(sideCol, sideRow)) return 0.5 - inset;
            return solid(sideCol + nx, sideRow + ny) ? 0.5 + inset : 0.5;
          };
          const baseX = col + 0.5 + nx * (0.5 - inset);
          const baseY = row + 0.5 + ny * (0.5 - inset);
          path.moveTo((baseX - tx * reach(-1)) * cell, (baseY - ty * reach(-1)) * cell);
          path.lineTo((baseX + tx * reach(1)) * cell, (baseY + ty * reach(1)) * cell);
        }
      }
    }
    return path;
  }

  private drawEnergy(game: ChromaChaseGame) {
    const { ctx, cell, wallPath } = this;
    if (!wallPath) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!this.reducedMotion) {
      ctx.setLineDash([cell * 0.5, cell * 3.5]);
      ctx.lineDashOffset = -this.time * cell * 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.stroke(wallPath);
      ctx.setLineDash([]);
    }
    const surging = game.surgeLeft > 0 ? 0.16 + Math.sin(this.time * 6) * 0.08 : 0;
    const strength = this.pulse * 0.8 + surging;
    if (strength > 0) {
      ctx.globalAlpha = Math.min(1, strength);
      ctx.strokeStyle = this.pulse > 0.5 ? PALETTE.acid : PALETTE.cyan;
      ctx.lineWidth = cell * 0.2;
      ctx.stroke(wallPath);
    }
    ctx.restore();
  }

  private drawPickups(game: ChromaChaseGame) {
    const { ctx, cell, time } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const pickup = game.pickups[tileIndex(col, row)];
        if (!pickup) continue;
        const x = this.center(col);
        const y = this.center(row);
        if (pickup === 1) {
          const twinkle = this.reducedMotion ? 1 : 0.8 + Math.sin(time * 4 + col * 1.7 + row * 2.3) * 0.25;
          const size = cell * 0.085 * twinkle;
          ctx.fillStyle = 'rgba(0, 245, 255, 0.22)';
          ctx.beginPath();
          ctx.arc(x, y, size * 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d8fdff';
          ctx.beginPath();
          ctx.moveTo(x, y - size * 1.4);
          ctx.lineTo(x + size * 1.4, y);
          ctx.lineTo(x, y + size * 1.4);
          ctx.lineTo(x - size * 1.4, y);
          ctx.closePath();
          ctx.fill();
        } else {
          const beat = this.reducedMotion ? 1 : 1 + Math.sin(time * 5) * 0.15;
          const radius = cell * 0.27 * beat;
          ctx.shadowColor = PALETTE.acid;
          ctx.shadowBlur = cell * 0.7;
          ctx.fillStyle = PALETTE.acid;
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = PALETTE.pink;
          ctx.lineWidth = Math.max(1, cell * 0.06);
          ctx.beginPath();
          const spin = this.reducedMotion ? 0 : time * 2;
          ctx.ellipse(x, y, radius * 1.25, radius * 0.5, spin, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = PALETTE.cyan;
          ctx.beginPath();
          ctx.ellipse(x, y, radius * 1.25, radius * 0.5, -spin, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private drawTrail(game: ChromaChaseGame) {
    const { ctx, cell } = this;
    const { x, y } = positionOf(game.orb);
    if (this.reducedMotion) return;

    const previous = this.trail[0];
    if (previous && Math.hypot(previous.x - x, previous.y - y) > 3) this.trail = [];
    if (game.status === 'playing') {
      this.trail.unshift({ x, y });
      if (this.trail.length > TRAIL_LENGTH) this.trail.pop();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.trail.forEach((point, index) => {
      const fade = 1 - index / TRAIL_LENGTH;
      ctx.fillStyle = game.surgeLeft > 0 ? PALETTE.pink : PALETTE.yellow;
      ctx.globalAlpha = fade * 0.22;
      ctx.beginPath();
      ctx.arc(this.center(point.x), this.center(point.y), cell * 0.34 * fade, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /** The orb is a soft blob that stretches as it moves and grows spikes while surging. */
  private orbShape(cx: number, cy: number, radius: number, game: ChromaChaseGame) {
    const { ctx, time } = this;
    const moving = game.orb.dir && game.status === 'playing' ? VECTORS[game.orb.dir] : { dx: 0, dy: 0 };
    const spikes = game.surgeLeft > 0 ? 0.3 : 0;
    const wobble = this.reducedMotion ? 0 : 1;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      let r = radius * (1 + wobble * (Math.sin(angle * 3 + time * 5) * 0.06 + Math.sin(angle * 5 - time * 4) * 0.04));
      if (spikes) r *= 1 + spikes * Math.pow(Math.abs(Math.sin(angle * 4 + time * 3 * wobble)), 3);
      const along = Math.cos(angle) * moving.dx + Math.sin(angle) * moving.dy;
      r *= 1 + 0.16 * along * along * (along > 0 ? 1 : 0.4);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawOrb(game: ChromaChaseGame) {
    const { ctx, cell, time } = this;
    if (game.status === 'gameover') return;
    if (game.invulnerableLeft > 0 && Math.floor(time * 12) % 2 === 0) return;

    let radius = cell * 0.4;
    if (game.status === 'hit') {
      const progress = 1 - game.timer / GAME.hitSeconds;
      radius *= Math.max(0, 1 - progress * 1.25);
      if (radius <= 0) return;
    }

    const { x, y } = positionOf(game.orb);
    const cx = this.center(x);
    const cy = this.center(y);
    const fringe = this.reducedMotion ? cell * 0.03 : cell * (0.05 + Math.sin(time * 7) * 0.02);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = PALETTE.pink;
    this.orbShape(cx - fringe, cy, radius, game);
    ctx.fill();
    ctx.fillStyle = PALETTE.cyan;
    this.orbShape(cx + fringe, cy, radius, game);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const fill = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.3);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.45, PALETTE.yellow);
    fill.addColorStop(1, game.surgeLeft > 0 ? PALETTE.pink : '#ff9d00');
    ctx.shadowColor = PALETTE.yellow;
    ctx.shadowBlur = cell * 0.8;
    ctx.fillStyle = fill;
    this.orbShape(cx, cy, radius, game);
    ctx.fill();
    ctx.restore();
  }

  private drawCreature(game: ChromaChaseGame, creature: Creature) {
    const { ctx, cell, time } = this;
    const { x, y } = positionOf(creature);
    const motion = this.reducedMotion ? 0 : 1;
    const bob = Math.sin(time * 6 + creature.col) * cell * 0.03 * motion;
    const cx = this.center(x);
    const cy = this.center(y) + bob;
    const size = cell * 0.42;

    if (creature.mode === 'returning') {
      this.drawEyes(cx, cy, size, creature, '#ffffff');
      return;
    }

    const expiring = game.surgeLeft > 0 && game.surgeLeft < GAME.surgeWarningSeconds;
    const flash = expiring && Math.floor(time * 7) % 2 === 0;
    const color = creature.vulnerable ? (flash ? '#ffffff' : PALETTE.violet) : CREATURE_COLORS[creature.id];
    const warning = creature.id === 'glitchling' && creature.mode === 'active' && !creature.vulnerable &&
      creature.blinkAt - game.time < GAME.glitchlingWarningSeconds;
    if (warning && Math.floor(time * 20) % 2 === 0) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = color;
    ctx.shadowBlur = cell * 0.55;
    ctx.fillStyle = creature.vulnerable ? 'rgba(25, 11, 53, 0.85)' : `${color}55`;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, cell * 0.08);
    ctx.lineJoin = 'round';

    switch (creature.id) {
      case 'lancer': {
        const v = creature.dir ? VECTORS[creature.dir] : { dx: 0, dy: -1 };
        ctx.rotate(Math.atan2(v.dy, v.dx));
        const stretch = creature.charging ? 1.3 : 1;
        ctx.beginPath();
        ctx.moveTo(size * 1.1 * stretch, 0);
        ctx.lineTo(-size * 0.8, -size * 0.85);
        ctx.lineTo(-size * 0.35, 0);
        ctx.lineTo(-size * 0.8, size * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-Math.atan2(v.dy, v.dx));
        break;
      }
      case 'warden': {
        ctx.save();
        ctx.rotate(time * 0.8 * motion);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        const orbit = time * 3 * motion;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(Math.cos(orbit) * size * 1.15, Math.sin(orbit) * size * 1.15, Math.max(1, cell * 0.06), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'glitchling': {
        const unit = size * 0.62;
        const offsets = [[-1, -1], [0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]];
        for (const [ox, oy] of offsets) {
          const jitter = motion ? Math.sin(time * 19 + ox * 3 + oy * 5) * cell * 0.025 : 0;
          ctx.fillRect(ox * unit - unit * 0.1 + jitter, oy * unit - unit * 0.1 - jitter, unit * 0.92, unit * 0.92);
          ctx.strokeRect(ox * unit - unit * 0.1 + jitter, oy * unit - unit * 0.1 - jitter, unit * 0.92, unit * 0.92);
        }
        break;
      }
      case 'mirrorcoil': {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.92, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        const turn = time * 2.5 * motion;
        for (let i = 0; i <= 30; i++) {
          const progress = i / 30;
          const angle = progress * Math.PI * 5 + turn;
          const radius = size * (0.15 + progress * 0.82);
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }
    }
    ctx.restore();

    this.drawEyes(cx, cy, size, creature, creature.vulnerable ? PALETTE.yellow : '#ffffff');
  }

  private drawEyes(cx: number, cy: number, size: number, creature: Creature, white: string) {
    const { ctx } = this;
    const v = creature.dir ? VECTORS[creature.dir] : { dx: 0, dy: 0 };
    const gap = size * 0.34;
    const eye = size * 0.24;
    const look = eye * 0.45;
    ctx.save();
    for (const side of [-1, 1]) {
      const ex = cx + side * gap;
      const ey = cy - size * 0.1;
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.arc(ex, ey, eye, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.background;
      ctx.beginPath();
      ctx.arc(ex + v.dx * look, ey + v.dy * look, eye * 0.52, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private burst(x: number, y: number, count: number, speed: number, colors: string[], life: number) {
    const total = this.reducedMotion ? Math.min(2, count) : count;
    for (let i = 0; i < total && this.sparks.length < MAX_SPARKS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.75);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: 0.04 + Math.random() * 0.06,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private updateAndDrawEffects(game: ChromaChaseGame, dt: number) {
    const { ctx, cell } = this;

    if (game.status === 'victory' && !this.reducedMotion) {
      this.confettiClock += dt;
      if (this.confettiClock > 0.12) {
        this.confettiClock = 0;
        this.burst(Math.random() * COLS, Math.random() * ROWS, 12, 4, [PALETTE.pink, PALETTE.cyan, PALETTE.acid, PALETTE.yellow, PALETTE.violet], 1.2);
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.sparks = this.sparks.filter((spark) => {
      spark.life -= dt;
      if (spark.life <= 0) return false;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      ctx.globalAlpha = spark.life / spark.maxLife;
      ctx.fillStyle = spark.color;
      const size = spark.size * cell;
      ctx.fillRect(this.center(spark.x) - size, this.center(spark.y) - size, size * 2, size * 2);
      return true;
    });

    this.rings = this.rings.filter((ring) => {
      ring.age += dt;
      if (ring.age < 0) return true;
      const progress = ring.age / ring.duration;
      if (progress >= 1) return false;
      if (!this.reducedMotion) {
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = cell * 0.25 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(this.center(ring.x), this.center(ring.y), progress * cell * 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      return true;
    });
    ctx.restore();
  }

  /** Brief horizontal slices with a colour split, used when the orb is hit. */
  private drawDistortion() {
    const { ctx, canvas } = this;
    const slices = 7;
    const height = canvas.height / slices;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < slices; i++) {
      if (Math.random() > this.distortion) continue;
      const shift = (Math.random() - 0.5) * this.cell * 0.9 * this.distortion;
      ctx.drawImage(canvas, 0, i * height, canvas.width, height, shift, i * height, canvas.width, height);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14 * this.distortion;
    ctx.fillStyle = PALETTE.pink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}
