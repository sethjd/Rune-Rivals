import { BOARD_WIDTH, RUNES } from "./constants.js";

const OFFSETS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

export class RunePiece {
  constructor(runes = randomRunePair()) {
    this.runes = runes;
    this.x = Math.floor(BOARD_WIDTH / 2) - 1;
    this.y = 0;
    this.rotation = 0;
  }

  cells(x = this.x, y = this.y, rotation = this.rotation) {
    const offset = OFFSETS[rotation];
    return [
      { x, y, type: this.runes[0] },
      { x: x + offset.x, y: y + offset.y, type: this.runes[1] }
    ];
  }

  clone() {
    const piece = new RunePiece([...this.runes]);
    piece.x = this.x;
    piece.y = this.y;
    piece.rotation = this.rotation;
    return piece;
  }

  serialize() {
    return {
      runes: [...this.runes],
      x: this.x,
      y: this.y,
      rotation: this.rotation
    };
  }

  static from(data) {
    const piece = new RunePiece(data.runes);
    piece.x = data.x;
    piece.y = data.y;
    piece.rotation = data.rotation;
    return piece;
  }
}

export function randomRune() {
  return RUNES[Math.floor(Math.random() * RUNES.length)];
}

export function randomRunePair() {
  return [randomRune(), randomRune()];
}
