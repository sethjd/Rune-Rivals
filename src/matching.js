import { BOARD_HEIGHT, BOARD_WIDTH, RUNES } from "./constants.js";

export function findMatches(grid) {
  const visited = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(false));
  const groups = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const type = grid[y][x];
      if (!RUNES.includes(type) || visited[y][x]) continue;

      const group = [];
      const queue = [{ x, y }];
      visited[y][x] = true;

      while (queue.length) {
        const cell = queue.shift();
        group.push(cell);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (
            nx >= 0 && nx < BOARD_WIDTH &&
            ny >= 0 && ny < BOARD_HEIGHT &&
            !visited[ny][nx] &&
            grid[ny][nx] === type
          ) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      if (group.length >= 3) groups.push({ type, cells: group });
    }
  }

  return groups;
}

export function matchedCellKeys(groups) {
  return new Set(groups.flatMap((group) => group.cells.map(({ x, y }) => `${x},${y}`)));
}
