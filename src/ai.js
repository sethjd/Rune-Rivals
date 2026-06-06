import { AI_SPEEDS, BOARD_HEIGHT, BOARD_WIDTH } from "./constants.js";
import { findMatches } from "./matching.js";
import { RunePiece } from "./pieces.js";

export class RuneAI {
  constructor(difficulty = "normal") {
    this.configure({ difficulty });
    this.elapsed = 0;
  }

  configure({ difficulty = "normal", speed, accuracy } = {}) {
    this.difficulty = difficulty;
    this.speed = speed ?? AI_SPEEDS[difficulty] ?? AI_SPEEDS.normal;
    this.accuracy = accuracy ?? ({ easy: 0.45, normal: 0.72, hard: 0.95 }[difficulty] ?? 0.72);
  }

  reset() {
    this.elapsed = 0;
  }

  update(delta, game) {
    this.elapsed += delta;
    if (this.elapsed < this.speed || game.resolving || game.over) return;
    this.elapsed = 0;
    game.placeAIPiece(this.choosePlacement(game.enemyBoard, game.enemyPiece));
  }

  choosePlacement(board, piece) {
    if (Math.random() > this.accuracy) return this.chooseCasualPlacement(board, piece);
    let best = null;

    for (let rotation = 0; rotation < 4; rotation += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const testPiece = new RunePiece([...piece.runes]);
        testPiece.x = x;
        testPiece.y = 0;
        testPiece.rotation = rotation;
        if (!board.canPlace(testPiece.cells())) continue;

        while (board.canPlace(testPiece.cells(testPiece.x, testPiece.y + 1, rotation))) {
          testPiece.y += 1;
        }

        const clone = board.clone();
        const overflowed = clone.lock(testPiece.cells());
        if (overflowed) continue;

        const matches = findMatches(clone.grid);
        const matchScore = matches.reduce((sum, group) => sum + group.cells.length * 20, 0);
        const heightPenalty = (BOARD_HEIGHT - clone.highestOccupiedRow()) * 2;
        const centerBonus = 4 - Math.abs(3.5 - x);
        const score = matchScore - heightPenalty + centerBonus + Math.random() * 2;

        if (!best || score > best.score) {
          best = { x: testPiece.x, y: testPiece.y, rotation, score };
        }
      }
    }

    return best ?? { x: 3, y: 0, rotation: 0 };
  }

  chooseCasualPlacement(board, piece) {
    const placements = [];
    for (let rotation = 0; rotation < 4; rotation += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const testPiece = new RunePiece([...piece.runes]);
        testPiece.x = x;
        testPiece.rotation = rotation;
        if (!board.canPlace(testPiece.cells())) continue;
        while (board.canPlace(testPiece.cells(testPiece.x, testPiece.y + 1, rotation))) testPiece.y += 1;
        placements.push({
          x: testPiece.x,
          y: testPiece.y,
          rotation,
          height: testPiece.y
        });
      }
    }
    placements.sort((a, b) => b.height - a.height);
    const saferHalf = placements.slice(0, Math.max(1, Math.ceil(placements.length / 2)));
    return saferHalf[Math.floor(Math.random() * saferHalf.length)] ?? { x: 3, y: 0, rotation: 0 };
  }
}
