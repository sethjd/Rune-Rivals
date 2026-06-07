import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants.js";
import { findMatches, matchedCellKeys } from "./matching.js";

export class RuneBoard {
  constructor() {
    this.grid = emptyGrid();
    this.highlighted = new Set();
  }

  reset() {
    this.grid = emptyGrid();
    this.highlighted.clear();
  }

  canPlace(cells) {
    return cells.every(({ x, y }) => {
      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false;
      return y < 0 || this.grid[y][x] === null;
    });
  }

  lock(cells) {
    let overflowed = false;
    for (const { x, y, type } of cells) {
      if (y < 0) {
        overflowed = true;
      } else if (y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        this.grid[y][x] = type;
      }
    }
    return overflowed;
  }

  clearTopRows(count = 3) {
    for (let y = 0; y < Math.min(count, BOARD_HEIGHT); y += 1) {
      this.grid[y].fill(null);
    }
    this.applyGravity();
  }

  removeCells(groups) {
    for (const group of groups) {
      for (const { x, y } of group.cells) this.grid[y][x] = null;
    }
  }

  applyGravity() {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const column = [];
      for (let y = BOARD_HEIGHT - 1; y >= 0; y -= 1) {
        if (this.grid[y][x] !== null) column.push(this.grid[y][x]);
      }
      for (let y = BOARD_HEIGHT - 1; y >= 0; y -= 1) {
        this.grid[y][x] = column[BOARD_HEIGHT - 1 - y] ?? null;
      }
    }
  }

  removeJunk(maximum) {
    let removed = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0 && removed < maximum; y -= 1) {
      for (let x = 0; x < BOARD_WIDTH && removed < maximum; x += 1) {
        if (this.grid[y][x] === "junk") {
          this.grid[y][x] = null;
          removed += 1;
        }
      }
    }
    if (removed) this.applyGravity();
    return removed;
  }

  removeHighestTile() {
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.grid[y][x] !== null) {
          this.grid[y][x] = null;
          this.applyGravity();
          return true;
        }
      }
    }
    return false;
  }

  addJunk(count) {
    let overflowed = false;
    for (let i = 0; i < count; i += 1) {
      const available = [];
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.grid[0][x] === null) available.push(x);
      }
      if (!available.length) {
        overflowed = true;
        break;
      }
      const x = available[Math.floor(Math.random() * available.length)];
      let targetY = 0;
      while (targetY + 1 < BOARD_HEIGHT && this.grid[targetY + 1][x] === null) targetY += 1;
      this.grid[targetY][x] = "junk";
    }
    return overflowed;
  }

  async resolveMatches({ onHighlight, onClear, shouldContinue } = {}) {
    let combo = 0;
    let groups = findMatches(this.grid);

    while (groups.length) {
      if (shouldContinue && !shouldContinue()) break;
      combo += 1;
      this.highlighted = matchedCellKeys(groups);
      try {
        await onHighlight?.(groups, combo);
        if (shouldContinue && !shouldContinue()) break;
        this.removeCells(groups);
        this.applyGravity();
        await onClear?.(groups, combo);
        if (shouldContinue && !shouldContinue()) break;
      } finally {
        this.highlighted.clear();
      }
      groups = findMatches(this.grid);
    }

    return combo;
  }

  resolveMatchesImmediately(startCombo = 0) {
    let combo = Math.max(0, Number(startCombo) || 0);
    let groups = findMatches(this.grid);
    const clears = [];
    this.highlighted.clear();

    while (groups.length) {
      combo += 1;
      this.removeCells(groups);
      this.applyGravity();
      clears.push({ groups, combo });
      groups = findMatches(this.grid);
    }

    return clears;
  }

  highestOccupiedRow() {
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      if (this.grid[y].some(Boolean)) return y;
    }
    return BOARD_HEIGHT;
  }

  clone() {
    const board = new RuneBoard();
    board.grid = this.grid.map((row) => [...row]);
    return board;
  }

  serialize() {
    return this.grid.map((row) => [...row]);
  }

  load(grid) {
    if (!Array.isArray(grid) || grid.length !== BOARD_HEIGHT) return;
    this.grid = grid.map((row) => Array.from({ length: BOARD_WIDTH }, (_, x) => row?.[x] ?? null));
    this.highlighted.clear();
  }
}

export function emptyGrid() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}
