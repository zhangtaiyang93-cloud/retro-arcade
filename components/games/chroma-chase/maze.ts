// The Chroma Chase maze: concentric rings around a central den, mirrored left to right.
// # wall   . energy particle   o energy core   - den door   D den   P orb start

const LEFT_HALF = [
  '##########',
  '#o........',
  '#.###.###.',
  '#.#.....#.',
  '#.#.###.#.',
  '#...#.....',
  '#.###.####',
  '#.###.....',
  '#.....###-',
  '###.#.#DDD',
  '....#.#DDD',
  '###.#.#DDD',
  '#.....####',
  '#.###.....',
  '#.#...###.',
  '#.#.###..P',
  '#...#...#.',
  '#.###.#.#.',
  '#.###.#.#.',
  '#o........',
  '##########'
];

export const MAZE_ROWS = LEFT_HALF.map((row) => row + row.slice(0, -1).split('').reverse().join(''));
export const ROWS = MAZE_ROWS.length;
export const COLS = MAZE_ROWS[0].length;

export const ORB_START = { col: 9, row: 15 };
export const DEN_CENTER = { col: 9, row: 10 };
/** The open tile just above the den door, where released creatures enter the maze. */
export const DEN_EXIT = { col: 9, row: 7 };

export const wrapCol = (col: number) => ((col % COLS) + COLS) % COLS;
export const tileIndex = (col: number, row: number) => row * COLS + col;

export function tileAt(col: number, row: number): string {
  if (row < 0 || row >= ROWS) return '#';
  return MAZE_ROWS[row][wrapCol(col)];
}

export const isWall = (col: number, row: number) => tileAt(col, row) === '#';

/** Open maze the orb can use. The den and its door are only for creatures. */
export function isOpen(col: number, row: number): boolean {
  const tile = tileAt(col, row);
  return tile !== '#' && tile !== '-' && tile !== 'D';
}

const FIELD_NEIGHBOURS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const fieldCache = new Map<string, Int16Array>();

/** Walking distance from every tile to the target. -1 means unreachable. */
export function distanceField(targetCol: number, targetRow: number, throughDen: boolean): Int16Array {
  const key = `${targetCol},${targetRow},${throughDen}`;
  const cached = fieldCache.get(key);
  if (cached) return cached;

  const field = new Int16Array(COLS * ROWS).fill(-1);
  const queue: Array<[number, number]> = [[targetCol, targetRow]];
  field[tileIndex(targetCol, targetRow)] = 0;
  for (let head = 0; head < queue.length; head++) {
    const [col, row] = queue[head];
    const next = field[tileIndex(col, row)] + 1;
    for (const [dx, dy] of FIELD_NEIGHBOURS) {
      const c = wrapCol(col + dx);
      const r = row + dy;
      const passable = throughDen ? !isWall(c, r) : isOpen(c, r);
      if (passable && field[tileIndex(c, r)] === -1) {
        field[tileIndex(c, r)] = next;
        queue.push([c, r]);
      }
    }
  }
  fieldCache.set(key, field);
  return field;
}

let openTilesCache: Array<{ col: number; row: number }> | null = null;

export function openTiles() {
  if (!openTilesCache) {
    openTilesCache = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (isOpen(col, row)) openTilesCache.push({ col, row });
      }
    }
  }
  return openTilesCache;
}

/** The open tile closest to any position, used when a target lands inside a wall. */
export function nearestOpenTile(col: number, row: number) {
  let best = ORB_START;
  let bestDistance = Infinity;
  for (const tile of openTiles()) {
    const distance = Math.abs(tile.col - col) + Math.abs(tile.row - row);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = tile;
    }
  }
  return best;
}
