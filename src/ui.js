import { BOARD_HEIGHT, BOARD_WIDTH, RUNE_DATA } from "./constants.js";

export class GameUI {
  constructor() {
    this.screens = [...document.querySelectorAll(".screen")];
    this.playerBoard = document.querySelector("#player-board");
    this.enemyBoard = document.querySelector("#enemy-board");
    this.playerSpell = document.querySelector("#player-spell");
    this.enemySpell = document.querySelector("#enemy-spell");
    this.comboBanner = document.querySelector("#combo-banner");
    this.battleEffect = document.querySelector("#battle-effect");
    this.battleEffectImage = document.querySelector("#battle-effect-image");
    this.combatFloatLayer = document.querySelector("#combat-float-layer");
    this.pauseOverlay = document.querySelector("#pause-overlay");
    this.makeBoardCells(this.playerBoard);
    this.makeBoardCells(this.enemyBoard);
  }

  showScreen(id) {
    for (const screen of this.screens) screen.classList.toggle("active", screen.id === id);
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
    this.renderSurge(game);
    this.renderDanger(game);
    document.querySelector("#battle-status").textContent = game.paused
      ? "Battle Paused"
      : game.mode === "online" && game.over
        ? "Confirming Result..."
        : "Rune Duel";
    if (game.mode !== "online") document.querySelector("#target-status").textContent = "";
    this.pauseOverlay.classList.toggle("hidden", !game.paused);
  }

  renderSurge(game) {
    const focus = Math.max(0, Math.min(game.player.maxFocus, game.player.focus));
    const percent = focus / Math.max(1, game.player.maxFocus) * 100;
    document.querySelector("#surge-fill").style.width = `${percent}%`;
    document.querySelector("#surge-text").textContent = percent >= 100 ? "READY" : `${Math.round(percent)}%`;
    const button = document.querySelector("#surge-button");
    button.disabled = percent < 100 || game.resolving || game.over || game.paused;
    button.classList.toggle("ready", percent >= 100 && !game.over);
  }

  renderDanger(game) {
    const danger = game.playerBoard.highestOccupiedRow() <= 3;
    document.querySelector(".player-combatant .board-shell").classList.toggle("danger", danger);
    document.querySelector("#danger-alert").classList.toggle("visible", danger && !game.over);
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
        if (type && RUNE_DATA[type]) {
          cellElement.classList.add("rune", `rune-${type}`);
          cellElement.style.backgroundImage = `url("${RUNE_DATA[type].icon}")`;
        }
        if (board.highlighted.has(`${x},${y}`)) cellElement.classList.add("matched");
      }
    }
  }

  renderFighter(prefix, fighter) {
    const maxHp = fighter.maxHp ?? 100;
    const hpPercent = Math.max(0, Math.min(100, fighter.hp / maxHp * 100));
    document.querySelector(`#${prefix}-hp-bar`).style.width = `${hpPercent}%`;
    document.querySelector(`#${prefix}-hp-text`).textContent = `${fighter.hp} / ${maxHp}`;
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
    window.setTimeout(() => element.classList.remove("visible"), 1050);

    const effectAssets = {
      fire: "./assets/spells/fireball.svg",
      water: "./assets/spells/cleanse.svg",
      earth: "./assets/spells/shield.svg",
      air: "./assets/runes/air.svg",
      lightning: "./assets/spells/lightning.svg",
      shadow: "./assets/spells/curse.svg",
      arcane: "./assets/spells/arcane-surge.svg"
    };
    this.battleEffectImage.src = effectAssets[result.type] ?? effectAssets.fire;
    this.battleEffect.className = `battle-effect active effect-${result.type} from-${side}`;
    const gameScreen = document.querySelector("#game-screen");
    gameScreen.classList.add(`impact-${side}`);
    window.setTimeout(() => {
      this.battleEffect.className = "battle-effect";
      gameScreen.classList.remove(`impact-${side}`);
    }, 760);

    if (result.combo > 1 || result.matchSize > 3) {
      const comboText = result.combo > 1 ? `${result.combo}x COMBO` : "POWER MATCH";
      const sizeBonus = result.matchSize > 3 ? ` · ${result.matchSize} RUNES` : "";
      this.comboBanner.textContent = `${comboText}${sizeBonus}!`;
      this.comboBanner.classList.add("visible");
      window.setTimeout(() => this.comboBanner.classList.remove("visible"), 1050);
    }
  }

  showDamage(side, amount, type = "fire") {
    if (!this.combatFloatLayer || !amount) return;
    const element = document.createElement("span");
    element.className = `combat-number combat-number-${side} combat-number-${type}`;
    element.textContent = `-${Math.round(amount)}`;
    this.combatFloatLayer.append(element);
    window.setTimeout(() => element.remove(), 1050);
  }

  setMode(mode, roomCode = "", options = {}) {
    const labels = {
      ai: "VS KAEL AI",
      story: options.storyLevel ? `STORY · LEVEL ${options.storyLevel.number}` : "STORY DUEL",
      debug: "LOCAL DEBUG DUEL",
      online: roomCode ? `ONLINE · ${roomCode}` : "ONLINE DUEL"
    };
    document.querySelector("#mode-label").textContent = labels[mode] ?? "RUNE DUEL";
    document.querySelector("#player-name").textContent = options.playerName ?? "LYRA";
    document.querySelector("#enemy-name").textContent = options.opponentName ?? (mode === "ai" ? "KAEL AI" : "RIVAL");
    if (options.playerAvatar) document.querySelector(".portrait-player img").src = options.playerAvatar;
    if (options.opponentAvatar) document.querySelector("#enemy-portrait").src = options.opponentAvatar;
  }

  updateOnlineTarget({ name, avatar, aliveCount, totalPlayers }) {
    document.querySelector("#enemy-name").textContent = name ?? "RIVAL";
    if (avatar) document.querySelector("#enemy-portrait").src = avatar;
    document.querySelector("#target-status").textContent =
      `TARGET: ${name ?? "RIVAL"} · ${aliveCount}/${totalPlayers} REMAIN`;
  }

  announceResult(won, message) {
    document.querySelector("#result-title").textContent = won ? "Victory!" : "Defeat";
    document.querySelector("#result-eyebrow").textContent = won ? "Runes aligned" : "Your ward has fallen";
    document.querySelector("#result-message").textContent = message;
    this.showScreen("result-screen");
  }

  announcePlacement(place, totalPlayers) {
    const suffix = ordinal(place);
    const won = place === 1;
    document.querySelector("#result-title").textContent = won ? "Victory!" : `${suffix} Place`;
    document.querySelector("#result-eyebrow").textContent = won ? "Last mage standing" : "You were eliminated";
    document.querySelector("#result-message").textContent = won
      ? `You defeated the field and placed 1st of ${totalPlayers}.`
      : `You placed ${suffix} out of ${totalPlayers} players.`;
    this.showScreen("result-screen");
  }
}

function ordinal(number) {
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
}
