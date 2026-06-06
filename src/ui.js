import { BOARD_HEIGHT, BOARD_WIDTH, RUNE_DATA } from "./constants.js";

export class GameUI {
  constructor() {
    this.screens = [...document.querySelectorAll(".screen")];
    this.playerBoard = document.querySelector("#player-board");
    this.enemyBoard = document.querySelector("#enemy-board");
    this.playerSpell = document.querySelector("#player-spell");
    this.enemySpell = document.querySelector("#enemy-spell");
    this.comboBanner = document.querySelector("#combo-banner");
    this.pauseOverlay = document.querySelector("#pause-overlay");
    this.makeBoardCells(this.playerBoard);
    this.makeBoardCells(this.enemyBoard);
  }

  showScreen(id) {
    for (const screen of this.screens) {
      screen.classList.toggle("active", screen.id === id);
    }
  }

  makeBoardCells(element) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < BOARD_WIDTH * BOARD_HEIGHT; i += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      fragment.append(cell);
    }
    element.replaceChildren(fragment);
  }

  render(game) {
    this.renderBoard(this.playerBoard, game.playerBoard, game.playerPiece, game.controlledSide === "player");
    this.renderBoard(this.enemyBoard, game.enemyBoard, game.enemyPiece, game.controlledSide === "enemy");
    this.renderFighter("player", game.player);
    this.renderFighter("enemy", game.enemy);
    this.renderNext(document.querySelector("#player-next"), game.playerNext);
    this.renderNext(document.querySelector("#enemy-next"), game.enemyNext);

    document.querySelector("#battle-status").textContent = game.paused ? "Battle Paused" : "Rune Duel";
    this.pauseOverlay.classList.toggle("hidden", !game.paused);
  }

  renderBoard(element, board, activePiece, active) {
    const display = board.grid.map((row) => [...row]);
    if (activePiece) {
      for (const cell of activePiece.cells()) {
        if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
          display[cell.y][cell.x] = cell.type;
        }
      }
    }

    element.classList.toggle("controlled-board", active);
    const cells = element.children;
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const index = y * BOARD_WIDTH + x;
        const cellElement = cells[index];
        const type = display[y][x];
        cellElement.className = "cell";
        cellElement.style.backgroundImage = "";
        if (type) {
          cellElement.classList.add("rune", `rune-${type}`);
          cellElement.style.backgroundImage = `url("${RUNE_DATA[type].icon}")`;
        }
        if (board.highlighted.has(`${x},${y}`)) cellElement.classList.add("matched");
      }
    }
  }

  renderFighter(prefix, fighter) {
    const hpPercent = Math.max(0, fighter.hp);
    document.querySelector(`#${prefix}-hp-bar`).style.width = `${hpPercent}%`;
    document.querySelector(`#${prefix}-hp-text`).textContent = `${fighter.hp} HP`;
    document.querySelector(`#${prefix}-shield`).textContent = `◇ ${fighter.shield}`;
  }

  renderNext(element, piece) {
    if (!piece) {
      element.replaceChildren();
      return;
    }
    element.innerHTML = piece.runes.map((type) => (
      `<span class="mini-rune rune-${type}" style="background-image:url('${RUNE_DATA[type].icon}')"></span>`
    )).join("");
  }

  showSpell(side, result) {
    const element = side === "player" ? this.playerSpell : this.enemySpell;
    element.textContent = result.label;
    element.className = `spell-popup visible spell-${result.type}`;
    window.setTimeout(() => element.classList.remove("visible"), 850);

    if (result.combo > 1) {
      this.comboBanner.textContent = `${result.combo}x COMBO!`;
      this.comboBanner.classList.add("visible");
      window.setTimeout(() => this.comboBanner.classList.remove("visible"), 900);
    }
  }

  setMode(mode, roomCode = "") {
    const labels = {
      ai: "VS ARCANE AI",
      debug: "LOCAL DEBUG DUEL",
      online: roomCode ? `ONLINE · ${roomCode}` : "ONLINE DUEL"
    };
    document.querySelector("#mode-label").textContent = labels[mode] ?? "RUNE DUEL";
    document.querySelector("#enemy-name").textContent = mode === "ai" ? "ARCANE AI" : "RIVAL";
    document.querySelector("#enemy-portrait-letter").textContent = mode === "ai" ? "A" : "R";
  }

  announceResult(won, message) {
    document.querySelector("#result-title").textContent = won ? "Victory!" : "Defeat";
    document.querySelector("#result-eyebrow").textContent = won ? "Runes aligned" : "Your ward has fallen";
    document.querySelector("#result-message").textContent = message;
    this.showScreen("result-screen");
  }
}
