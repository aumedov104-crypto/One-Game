import {
  BUBBLE_D,
  BUBBLE_R,
  CANNON_X,
  CANNON_Y,
  GRID_COLS,
  GridBubble,
  LEFT_WALL,
  RIGHT_WALL,
  ROW_H,
  TOP_CEILING_BASE,
} from './types';

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function maxColsForRow(row: number): number {
  return row % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
}

export function isValidCell(row: number, col: number): boolean {
  if (row < 0 || row > 22) return false;
  return col >= 0 && col < maxColsForRow(row);
}

export function gridToPixel(
  row: number,
  col: number,
  ceilingDropRows: number
): { x: number; y: number } {
  const offset = row % 2 === 1 ? BUBBLE_R : 0;
  const x = LEFT_WALL + BUBBLE_R + offset + col * BUBBLE_D;
  const y = TOP_CEILING_BASE + ceilingDropRows * ROW_H + BUBBLE_R + row * ROW_H;
  return { x, y };
}

export function getNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
  const isOdd = row % 2 === 1;
  const deltas = isOdd
    ? [
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, 0],
        [1, 1],
      ]
    : [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
      ];

  const out: Array<{ row: number; col: number }> = [];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (isValidCell(nr, nc)) {
      out.push({ row: nr, col: nc });
    }
  }
  return out;
}

export function findNearestEmptyCell(
  px: number,
  py: number,
  grid: Map<string, GridBubble>,
  ceilingDropRows: number
): { row: number; col: number } {
  const approxRow = Math.max(
    0,
    Math.round((py - (TOP_CEILING_BASE + ceilingDropRows * ROW_H + BUBBLE_R)) / ROW_H)
  );

  let bestRow = 0;
  let bestCol = 0;
  let bestDistSq = Infinity;

  const minR = Math.max(0, approxRow - 2);
  const maxR = approxRow + 2;

  for (let r = minR; r <= maxR; r++) {
    const cols = maxColsForRow(r);
    for (let c = 0; c < cols; c++) {
      if (grid.has(cellKey(r, c))) continue;
      const pos = gridToPixel(r, c, ceilingDropRows);
      const dx = px - pos.x;
      const dy = py - pos.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestRow = r;
        bestCol = c;
      }
    }
  }

  return { row: bestRow, col: bestCol };
}

export function findColorCluster(
  startRow: number,
  startCol: number,
  targetColor: string,
  grid: Map<string, GridBubble>
): GridBubble[] {
  const visited = new Set<string>();
  const cluster: GridBubble[] = [];
  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
  visited.add(cellKey(startRow, startCol));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const bubble = grid.get(cellKey(curr.row, curr.col));
    if (!bubble) continue;
    // Stone and Star bubbles don't match by color directly (unless star is dropped)
    if (bubble.kind === 'stone' || bubble.kind === 'star') continue;
    // Frozen ice (hp >= 2) does not join color-match cluster; cracked (hp === 1) or normal/rainbow does
    if (bubble.kind === 'ice' && bubble.hp >= 2) continue;
    if (bubble.kind !== 'rainbow' && bubble.color !== targetColor) continue;

    cluster.push(bubble);

    for (const n of getNeighbors(curr.row, curr.col)) {
      const k = cellKey(n.row, n.col);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push(n);
      }
    }
  }

  return cluster;
}

export function findFloatingBubbles(grid: Map<string, GridBubble>): GridBubble[] {
  const anchored = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [];

  for (const b of grid.values()) {
    if (b.row === 0) {
      const k = cellKey(b.row, b.col);
      anchored.add(k);
      queue.push({ row: b.row, col: b.col });
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const n of getNeighbors(curr.row, curr.col)) {
      const k = cellKey(n.row, n.col);
      if (!anchored.has(k) && grid.has(k)) {
        anchored.add(k);
        queue.push(n);
      }
    }
  }

  const floating: GridBubble[] = [];
  for (const [k, b] of grid.entries()) {
    if (!anchored.has(k)) {
      floating.push(b);
    }
  }
  return floating;
}

export function getBubblesInRadius(
  centerRow: number,
  centerCol: number,
  radiusSteps: number,
  grid: Map<string, GridBubble>
): GridBubble[] {
  const visited = new Set<string>();
  const result: GridBubble[] = [];
  const queue: Array<{ row: number; col: number; dist: number }> = [
    { row: centerRow, col: centerCol, dist: 0 },
  ];
  visited.add(cellKey(centerRow, centerCol));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const bubble = grid.get(cellKey(curr.row, curr.col));
    if (bubble) {
      result.push(bubble);
    }
    if (curr.dist >= radiusSteps) continue;

    for (const n of getNeighbors(curr.row, curr.col)) {
      const k = cellKey(n.row, n.col);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ row: n.row, col: n.col, dist: curr.dist + 1 });
      }
    }
  }

  return result;
}

export interface AimTrace {
  points: Array<{ x: number; y: number }>;
  snapCell: { row: number; col: number } | null;
  snapPixel: { x: number; y: number } | null;
}

export function computeAimTrajectory(
  angleRad: number,
  grid: Map<string, GridBubble>,
  ceilingDropRows: number,
  maxSteps = 140
): AimTrace {
  const stepDist = 8;
  let x = CANNON_X + Math.cos(angleRad) * 34;
  let y = CANNON_Y + Math.sin(angleRad) * 34;
  let vx = Math.cos(angleRad) * stepDist;
  let vy = Math.sin(angleRad) * stepDist;

  const points: Array<{ x: number; y: number }> = [{ x, y }];
  const ceilingY = TOP_CEILING_BASE + ceilingDropRows * ROW_H + BUBBLE_R;
  const hitRadiusSq = (BUBBLE_D - 4) * (BUBBLE_D - 4);
  let bounces = 0;

  for (let i = 0; i < maxSteps; i++) {
    x += vx;
    y += vy;

    if (x <= LEFT_WALL + BUBBLE_R) {
      x = LEFT_WALL + BUBBLE_R + (LEFT_WALL + BUBBLE_R - x);
      vx = -vx;
      bounces++;
      points.push({ x, y });
    } else if (x >= RIGHT_WALL - BUBBLE_R) {
      x = RIGHT_WALL - BUBBLE_R - (x - (RIGHT_WALL - BUBBLE_R));
      vx = -vx;
      bounces++;
      points.push({ x, y });
    }

    if (bounces > 2) break;

    if (i % 2 === 0) {
      points.push({ x, y });
    }

    // Check ceiling hit
    if (y <= ceilingY) {
      const snapCell = findNearestEmptyCell(x, ceilingY, grid, ceilingDropRows);
      const snapPixel = gridToPixel(snapCell.row, snapCell.col, ceilingDropRows);
      points.push({ x, y: ceilingY });
      return { points, snapCell, snapPixel };
    }

    // Check bubble collision
    for (const b of grid.values()) {
      const bp = gridToPixel(b.row, b.col, ceilingDropRows);
      const dx = x - bp.x;
      const dy = y - bp.y;
      if (dx * dx + dy * dy <= hitRadiusSq) {
        const snapCell = findNearestEmptyCell(x - vx * 0.5, y - vy * 0.5, grid, ceilingDropRows);
        const snapPixel = gridToPixel(snapCell.row, snapCell.col, ceilingDropRows);
        points.push({ x, y });
        return { points, snapCell, snapPixel };
      }
    }
  }

  return { points, snapCell: null, snapPixel: null };
}
