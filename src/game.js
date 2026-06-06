import { RuneAI } from "./ai.js";
import { RuneBoard } from "./board.js";
import { DROP_SPEED } from "./constants.js";
import { RunePiece, randomRunePair } from "./pieces.js";
import { applyDamage, applyIncomingAttack, castSpell, createFighter } from "./spells.js";

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export class RuneRivalsGame {
  constructor(ui, { onGameOver, onNetworkSync, onAttack } = {}) {
    this.ui = ui;
    this.onGameOver = onGameOver;
    this.onNetworkSync = onNetworkSync;
    this.onAttack = onAttack;
    this.ai = new RuneAI("normal");
    this.loop = this.loop.bind(this);
    this.reset();
  }

  reset(mode = "ai") {
    this.mode = mode;
    this.playerBoard = new RuneBoard();
    this.enemyBoard = new RuneBoard();
    this.player = createFighter("YOU");
    this.enemy = createFighter(mode === "ai" ? "ARCANE AI" : "RIVAL");
    this.playerPiece = new RunePiece();
    this.playerNext = new RunePiece();
    this.enemyPiece = new RunePiece();
    this.enemyNext = new RunePiece();
    this.dropTimers = { player: 0, enemy: 0 };
    this.controlledSide = "player";
    this.paused = false;
    this.over = false;
    this.resolving = false;
    this.running = false;
    this.lastTime = 0;
    this.syncTimer = 0;
    this.ai.reset();
  }

  start(mode = "ai", roomCode = "") {
    this.stop();
    this.reset(mode);
    this.running = true;
    this.ui.setMode(mode, roomCode);
    this.ui.showScreen("game-screen");
    this.ui.render(this);
    this.frameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
  }

  loop(time) {
    if (!this.running) return;
    const delta = Math.min(80, time - (this.lastTime || time));
    this.lastTime = time;

    if (!this.paused && !this.over && !this.resolving) {
      this.updateFalling("player", delta);
      if (this.mode === "debug") this.updateFalling("enemy", delta);
      if (this.mode === "ai") this.ai.update(delta, this);

      if (this.mode === "online") {
        this.syncTimer += delta;
        if (this.syncTimer >= 220) {
          this.syncTimer = 0;
          this.onNetworkSync?.(this.serializeLocal());
        }
      }
    }

    this.ui.render(this);
    this.frameId = requestAnimationFrame(this.loop);
  }

  updateFalling(side, delta) {
    this.dropTimers[side] += delta;
    if (this.dropTimers[side] < DROP_SPEED) return;
    this.dropTimers[side] = 0;
    if (!this.move(side, 0, 1)) this.lockPiece(side);
  }

  handleAction(action) {
    if (this.paused || this.over || this.resolving) return;
    const side = this.mode === "debug" ? this.controlledSide : "player";
    if (this.mode === "online" && side !== "player") return;

    if (action === "left") this.move(side, -1, 0);
    if (action === "right") this.move(side, 1, 0);
    if (action === "down" && !this.move(side, 0, 1)) this.lockPiece(side);
    if (action === "rotate") this.rotate(side);
    if (action === "hard-drop") this.hardDrop(side);
  }

  move(side, dx, dy) {
    const board = this.getBoard(side);
    const piece = this.getPiece(side);
    if (!piece) return false;
    const cells = piece.cells(piece.x + dx, piece.y + dy, piece.rotation);
    if (!board.canPlace(cells)) return false;
    piece.x += dx;
    piece.y += dy;
    return true;
  }

  rotate(side) {
    const board = this.getBoard(side);
    const piece = this.getPiece(side);
    const nextRotation = (piece.rotation + 1) % 4;
    for (const kick of [0, -1, 1]) {
      if (board.canPlace(piece.cells(piece.x + kick, piece.y, nextRotation))) {
        piece.x += kick;
        piece.rotation = nextRotation;
        return true;
      }
    }
    return false;
  }

  hardDrop(side) {
    while (this.move(side, 0, 1)) {
      this.dropTimers[side] = 0;
    }
    this.lockPiece(side);
  }

  async lockPiece(side) {
    if (this.resolving || this.over) return;
    this.resolving = true;
    const board = this.getBoard(side);
    const fighter = this.getFighter(side);
    const piece = this.getPiece(side);
    const overflowed = board.lock(piece.cells());

    if (overflowed) this.handleOverflow(side);

    if (fighter.junkQueue > 0) {
      const junkOverflow = board.addJunk(fighter.junkQueue);
      fighter.junkQueue = 0;
      if (junkOverflow) this.handleOverflow(side);
    }

    await board.resolveMatches({
      onHighlight: async () => {
        this.ui.render(this);
        await wait(230);
      },
      onClear: async (groups, combo) => {
        for (const group of groups) this.castForSide(side, group.type, combo);
        this.ui.render(this);
        await wait(150);
      }
    });

    this.spawnNext(side);
    this.resolving = false;
    this.checkGameOver();
  }

  placeAIPiece(placement) {
    if (!placement) return;
    this.enemyPiece.x = placement.x;
    this.enemyPiece.y = placement.y;
    this.enemyPiece.rotation = placement.rotation;
    this.lockPiece("enemy");
  }

  castForSide(side, type, combo) {
    const caster = this.getFighter(side);
    const target = this.getFighter(this.otherSide(side));
    const casterBoard = this.getBoard(side);
    const targetBoard = this.getBoard(this.otherSide(side));
    const result = castSpell(type, combo, caster, target, casterBoard, targetBoard);
    this.ui.showSpell(side, result);
    if (result.overflowed) this.handleOverflow(this.otherSide(side));

    if (this.mode === "online" && side === "player" && result.attack) {
      this.onAttack?.(result.attack);
    }
    this.checkGameOver();
  }

  handleOverflow(side) {
    const fighter = this.getFighter(side);
    applyDamage(fighter, 20);
    this.getBoard(side).clearTopRows(3);
    this.ui.showSpell(side, { type: "shadow", label: "BOARD BREACH!", combo: 1 });
  }

  spawnNext(side) {
    if (side === "player") {
      this.playerPiece = this.playerNext;
      this.playerNext = new RunePiece(randomRunePair());
    } else {
      this.enemyPiece = this.enemyNext;
      this.enemyNext = new RunePiece(randomRunePair());
    }

    const board = this.getBoard(side);
    const piece = this.getPiece(side);
    if (!board.canPlace(piece.cells())) this.handleOverflow(side);
  }

  receiveAttack(attack) {
    const overflowed = applyIncomingAttack(attack, this.player, this.playerBoard);
    if (overflowed) this.handleOverflow("player");
    this.ui.showSpell("enemy", {
      type: attack.kind === "damage" ? "fire" : attack.kind === "curse" ? "shadow" : "lightning",
      label: attack.kind === "curse" ? "CURSE!" : attack.kind === "lightning" ? "CHAIN BOLT!" : "FIREBALL!",
      combo: 1
    });
    this.checkGameOver();
  }

  loadRemoteState(state) {
    if (!state || this.mode !== "online") return;
    this.enemyBoard.load(state.board);
    this.enemy.hp = state.hp ?? this.enemy.hp;
    this.enemy.shield = state.shield ?? this.enemy.shield;
    this.enemy.junkQueue = state.junkQueue ?? this.enemy.junkQueue;
    this.enemyPiece = state.currentPiece ? RunePiece.from(state.currentPiece) : null;
    this.enemyNext = state.nextPiece ? RunePiece.from(state.nextPiece) : null;
    this.checkGameOver();
  }

  serializeLocal() {
    return {
      board: this.playerBoard.serialize(),
      currentPiece: this.playerPiece?.serialize() ?? null,
      nextPiece: this.playerNext?.serialize() ?? null,
      hp: this.player.hp,
      shield: this.player.shield,
      junkQueue: this.player.junkQueue,
      updatedAt: Date.now()
    };
  }

  togglePause() {
    if (!this.running || this.over || this.mode === "online") return;
    this.paused = !this.paused;
  }

  swapDebugSide() {
    if (this.mode !== "debug" || this.paused || this.over) return;
    this.controlledSide = this.otherSide(this.controlledSide);
  }

  checkGameOver() {
    if (this.over) return;
    if (this.player.hp <= 0 || this.enemy.hp <= 0) {
      this.over = true;
      const won = this.enemy.hp <= 0 && this.player.hp > 0;
      this.onNetworkSync?.(this.serializeLocal());
      window.setTimeout(() => this.onGameOver?.(won), 450);
    }
  }

  getBoard(side) {
    return side === "player" ? this.playerBoard : this.enemyBoard;
  }

  getFighter(side) {
    return side === "player" ? this.player : this.enemy;
  }

  getPiece(side) {
    return side === "player" ? this.playerPiece : this.enemyPiece;
  }

  otherSide(side) {
    return side === "player" ? "enemy" : "player";
  }
}
