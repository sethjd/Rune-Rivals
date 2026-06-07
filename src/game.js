import { RuneAI } from "./ai.js";
import { RuneBoard } from "./board.js";
import { DROP_SPEED, OVERFLOW_DAMAGE, SURGE_VALUES } from "./constants.js";
import { RunePiece, randomRunePair } from "./pieces.js";
import { applyDamage, applyIncomingAttack, castSpell, createFighter } from "./spells.js";

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const FRAME_STALL_MS = 2500;
const RESOLUTION_STALL_MS = 20000;

export class RuneRivalsGame {
  constructor(ui, {
    onGameOver,
    onLocalEliminated,
    onNetworkSync,
    onAttack,
    onSpell,
    onMatch,
    onDrop,
    onHold,
    onSurgeReady
  } = {}) {
    this.ui = ui;
    this.onGameOver = onGameOver;
    this.onLocalEliminated = onLocalEliminated;
    this.onNetworkSync = onNetworkSync;
    this.onAttack = onAttack;
    this.onSpell = onSpell;
    this.onMatch = onMatch;
    this.onDrop = onDrop;
    this.onHold = onHold;
    this.onSurgeReady = onSurgeReady;
    this.ai = new RuneAI("normal");
    this.loop = this.loop.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.reset();
  }

  reset(mode = "ai", options = {}) {
    this.mode = mode;
    this.options = options;
    this.playerBoard = new RuneBoard();
    this.enemyBoard = new RuneBoard();
    this.player = createFighter(options.playerName ?? "YOU");
    this.enemy = createFighter(options.opponentName ?? (mode === "ai" ? "KAEL AI" : "RIVAL"));
    this.applyBattleRules(options.rules ?? {});
    this.playerPiece = new RunePiece();
    this.playerNext = new RunePiece();
    this.playerHold = null;
    this.enemyPiece = new RunePiece();
    this.enemyNext = new RunePiece();
    this.enemyHold = null;
    this.holdUsed = { player: false, enemy: false };
    this.dropTimers = { player: 0, enemy: 0 };
    this.controlledSide = "player";
    this.paused = false;
    this.over = false;
    this.resolving = false;
    this.resolutionToken = 0;
    this.resolutionStartedAt = 0;
    this.resolvingSide = "";
    this.resolutionPieceLocked = false;
    this.pendingAttacks = [];
    this.stats = {
      startedAt: Date.now(),
      damageDealt: 0,
      damageTaken: 0,
      runesCleared: 0,
      largestCombo: 0,
      spellsCast: 0,
      surgeUses: 0
    };
    this.running = false;
    this.lastTime = 0;
    this.syncTimer = 0;
    this.currentOnlineTargetId = "";
    this.ai.configure({
      difficulty: options.aiDifficulty ?? (mode === "ai" ? "easy" : "normal"),
      speed: options.rules?.aiSpeed,
      accuracy: options.rules?.aiAccuracy
    });
    this.ai.reset();
  }

  start(mode = "ai", roomCode = "", options = {}) {
    this.stop();
    this.reset(mode, options);
    this.running = true;
    this.ui.setMode(mode, roomCode, options);
    this.ui.showScreen("game-screen");
    this.ui.render(this);
    this.lastFrameAt = performance.now();
    this.scheduleNextFrame();
    this.startLoopWatchdog();
  }

  stop() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    if (this.watchdogId) window.clearInterval(this.watchdogId);
    this.watchdogId = null;
  }

  loop(time) {
    if (!this.running) return;
    this.frameId = null;
    this.lastFrameAt = performance.now();

    try {
      const delta = Math.min(80, time - (this.lastTime || time));
      this.lastTime = time;

      if (!this.paused && !this.over && !this.resolving) {
        this.updateFalling("player", delta);
        if (this.mode === "debug") this.updateFalling("enemy", delta);
        if (this.mode === "ai" || this.mode === "story") this.ai.update(delta, this);

        if (this.mode === "online") {
          this.syncTimer += delta;
          if (this.syncTimer >= 300) {
            this.syncTimer = 0;
            this.onNetworkSync?.(this.serializeLocal());
          }
        }
      }

      this.ui.render(this);
    } catch (error) {
      console.error("The game loop recovered from an error.", error);
    } finally {
      this.scheduleNextFrame();
    }
  }

  scheduleNextFrame() {
    if (!this.running || this.frameId) return;
    this.frameId = requestAnimationFrame(this.loop);
  }

  startLoopWatchdog() {
    if (this.watchdogId) window.clearInterval(this.watchdogId);
    this.watchdogId = window.setInterval(() => {
      if (!this.running || document.hidden) return;
      const now = performance.now();
      if (this.resolving && Date.now() - this.resolutionStartedAt > RESOLUTION_STALL_MS) {
        this.recoverStalledResolution();
      }
      if (!this.lastFrameAt || now - this.lastFrameAt <= FRAME_STALL_MS) return;
      if (this.frameId) cancelAnimationFrame(this.frameId);
      this.frameId = null;
      this.lastTime = 0;
      this.scheduleNextFrame();
    }, 1000);
  }

  handleVisibilityChange() {
    if (!this.running || document.hidden) return;
    this.lastTime = 0;
    this.lastFrameAt = performance.now();
    this.scheduleNextFrame();
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
    if (action === "hold") this.holdPiece(side);
    if (action === "surge") this.castSurge();
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

  holdPiece(side = "player") {
    if (this.holdUsed[side] || this.resolving || this.over) return false;
    const current = this.getPiece(side);
    if (!current) return false;

    const held = side === "player" ? this.playerHold : this.enemyHold;
    const replacement = held
      ? new RunePiece([...held.runes])
      : side === "player"
        ? this.playerNext
        : this.enemyNext;
    const newHold = new RunePiece([...current.runes]);

    if (side === "player") {
      this.playerHold = newHold;
      this.playerPiece = replacement;
      if (!held) this.playerNext = new RunePiece(randomRunePair());
    } else {
      this.enemyHold = newHold;
      this.enemyPiece = replacement;
      if (!held) this.enemyNext = new RunePiece(randomRunePair());
    }

    this.holdUsed[side] = true;
    this.dropTimers[side] = 0;
    if (!this.getBoard(side).canPlace(replacement.cells())) this.handleOverflow(side);
    this.onHold?.(side);
    return true;
  }

  async lockPiece(side) {
    if (this.resolving || this.over) return;
    const resolutionToken = ++this.resolutionToken;
    this.resolving = true;
    this.resolutionStartedAt = Date.now();
    this.resolvingSide = side;
    this.resolutionPieceLocked = false;
    let pieceLocked = false;
    try {
      this.onDrop?.(side);
      const board = this.getBoard(side);
      const fighter = this.getFighter(side);
      const piece = this.getPiece(side);
      const overflowed = board.lock(piece.cells());
      pieceLocked = true;
      this.resolutionPieceLocked = true;

      if (overflowed) this.handleOverflow(side);

      if (fighter.junkQueue > 0) {
        const junkOverflow = board.addJunk(fighter.junkQueue);
        fighter.junkQueue = 0;
        if (junkOverflow) this.handleOverflow(side);
      }

      await board.resolveMatches({
        onHighlight: async (groups, combo) => {
          this.assertActiveResolution(resolutionToken);
          this.onMatch?.(combo, groups);
          this.ui.render(this);
          await wait(230);
        },
        onClear: async (groups, combo) => {
          this.assertActiveResolution(resolutionToken);
          for (const group of groups) this.castForSide(side, group.type, combo, group.cells.length);
          this.ui.render(this);
          await wait(150);
        }
      });

      this.assertActiveResolution(resolutionToken);
      this.spawnNext(side);
      pieceLocked = false;
      this.resolutionPieceLocked = false;
    } catch (error) {
      if (resolutionToken === this.resolutionToken) {
        console.error("Could not finish resolving the placed runes.", error);
      }
      if (resolutionToken === this.resolutionToken && pieceLocked) {
        try {
          this.spawnNext(side);
          this.resolutionPieceLocked = false;
        } catch (spawnError) {
          console.error("Could not prepare the next rune piece.", spawnError);
        }
      }
    } finally {
      if (resolutionToken === this.resolutionToken) {
        this.finishResolution();
      }
    }
  }

  assertActiveResolution(resolutionToken) {
    if (resolutionToken !== this.resolutionToken) throw new Error("Stale rune resolution stopped.");
  }

  finishResolution() {
    this.resolving = false;
    this.resolutionStartedAt = 0;
    this.resolvingSide = "";
    this.resolutionPieceLocked = false;
    this.applyPendingAttacks();
    this.checkGameOver();
  }

  recoverStalledResolution() {
    const side = this.resolvingSide;
    const shouldSpawn = this.resolutionPieceLocked;
    this.resolutionToken += 1;
    if (side) this.getBoard(side).highlighted.clear();
    if (side && shouldSpawn) {
      try {
        this.spawnNext(side);
      } catch (error) {
        console.error("Could not recover the next rune piece.", error);
      }
    }
    this.finishResolution();
  }

  placeAIPiece(placement) {
    if (!placement) return;
    this.enemyPiece.x = placement.x;
    this.enemyPiece.y = placement.y;
    this.enemyPiece.rotation = placement.rotation;
    this.lockPiece("enemy");
  }

  castForSide(side, type, combo, matchSize = 3) {
    const caster = this.getFighter(side);
    const target = this.getFighter(this.otherSide(side));
    const casterBoard = this.getBoard(side);
    const targetBoard = this.getBoard(this.otherSide(side));
    const targetHpBefore = target.hp;
    const result = castSpell(
      type,
      combo,
      caster,
      target,
      casterBoard,
      targetBoard,
      matchSize,
      this.spellPowerFor(side, type)
    );
    this.ui.showSpell(side, result);
    this.onSpell?.(side, result);
    const damage = Math.max(0, targetHpBefore - target.hp);
    if (damage) this.ui.showDamage?.(this.otherSide(side), damage, type);
    if (side === "player") {
      this.stats.damageDealt += damage;
      this.stats.runesCleared += matchSize;
      this.stats.largestCombo = Math.max(this.stats.largestCombo, combo);
      this.stats.spellsCast += 1;
      this.chargeFocus(combo, matchSize);
    } else {
      this.stats.damageTaken += damage;
    }
    if (result.overflowed) this.handleOverflow(this.otherSide(side));

    if (this.mode === "online" && side === "player" && result.attack) {
      this.onAttack?.(result.attack);
    }
    this.checkGameOver();
  }

  chargeFocus(combo, matchSize) {
    const wasReady = this.player.focus >= this.player.maxFocus;
    const charge = 11 + Math.min(18, matchSize * 3) + Math.max(0, combo - 1) * 12;
    this.player.focus = Math.min(this.player.maxFocus, this.player.focus + charge);
    if (!wasReady && this.player.focus >= this.player.maxFocus) this.onSurgeReady?.();
  }

  castSurge() {
    if (
      this.mode === "debug" ||
      this.paused ||
      this.over ||
      this.resolving ||
      this.player.focus < this.player.maxFocus
    ) return false;

    this.player.focus = 0;
    this.player.shield += SURGE_VALUES.shield;
    this.playerBoard.removeJunk(SURGE_VALUES.cleanse);
    const hpBefore = this.enemy.hp;
    applyDamage(this.enemy, SURGE_VALUES.damage);
    const damage = Math.max(0, hpBefore - this.enemy.hp);
    if (this.mode !== "online") {
      const overflowed = this.enemyBoard.addJunk(SURGE_VALUES.junk);
      if (overflowed) this.handleOverflow("enemy");
    }
    const result = {
      type: "arcane",
      label: "ARCANE SURGE!",
      combo: 3,
      matchSize: 6
    };
    this.stats.damageDealt += damage;
    this.stats.spellsCast += 1;
    this.stats.surgeUses += 1;
    this.ui.showSpell("player", result);
    this.ui.showDamage?.("enemy", damage, "arcane");
    this.onSpell?.("player", result);

    if (this.mode === "online") {
      this.onAttack?.({
        kind: "surge",
        type: "arcane",
        damage: SURGE_VALUES.damage,
        junk: SURGE_VALUES.junk
      });
    }
    this.checkGameOver();
    return true;
  }

  handleOverflow(side) {
    const fighter = this.getFighter(side);
    applyDamage(fighter, OVERFLOW_DAMAGE);
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
    this.holdUsed[side] = false;

    const board = this.getBoard(side);
    const piece = this.getPiece(side);
    if (!board.canPlace(piece.cells())) this.handleOverflow(side);
  }

  receiveAttack(attack) {
    if (!attack || this.over) return;
    if (this.resolving) {
      this.pendingAttacks.push(attack);
      return;
    }
    this.applyIncomingAttackNow(attack);
  }

  applyPendingAttacks() {
    if (!this.pendingAttacks.length || this.over) return;
    const attacks = this.pendingAttacks.splice(0);
    for (const attack of attacks) {
      if (this.over) break;
      this.applyIncomingAttackNow(attack);
    }
  }

  applyIncomingAttackNow(attack) {
    const hpBefore = this.player.hp;
    const overflowed = applyIncomingAttack(attack, this.player, this.playerBoard);
    if (overflowed) this.handleOverflow("player");
    const damage = Math.max(0, hpBefore - this.player.hp);
    this.stats.damageTaken += damage;
    const result = {
      type: attack.type ?? (
        attack.kind === "curse"
          ? "shadow"
          : attack.kind === "lightning"
            ? "lightning"
            : attack.kind === "surge"
              ? "arcane"
              : "fire"
      ),
      label: `${attack.attackerName ?? "RIVAL"}: ${
        attack.type
          ? `${attack.type.toUpperCase()} SURGE!`
          : attack.kind === "curse"
            ? "CURSE!"
            : attack.kind === "lightning"
              ? "CHAIN BOLT!"
              : "FIREBALL!"
      }`,
      combo: 1,
      matchSize: 3
    };
    this.ui.showSpell("enemy", result);
    if (damage) this.ui.showDamage?.("player", damage, result.type);
    this.onSpell?.("enemy", result);
    this.checkGameOver();
  }

  loadRemoteState(state) {
    if (!state || this.mode !== "online") return;
    this.enemyBoard.load(state.board);
    this.enemy.hp = state.hp ?? this.enemy.hp;
    this.enemy.maxHp = state.maxHp ?? this.enemy.maxHp;
    this.enemy.shield = state.shield ?? this.enemy.shield;
    this.enemy.junkQueue = state.junkQueue ?? this.enemy.junkQueue;
    this.enemy.focus = state.focus ?? this.enemy.focus;
    this.enemyPiece = state.currentPiece ? RunePiece.from(state.currentPiece) : null;
    this.enemyNext = state.nextPiece ? RunePiece.from(state.nextPiece) : null;
    this.enemyHold = state.holdPiece ? RunePiece.from(state.holdPiece) : null;
    this.checkGameOver();
  }

  setOnlineTarget(target, avatar) {
    if (this.mode !== "online" || !target) return;
    const changed = target.id !== this.currentOnlineTargetId;
    if (changed) {
      this.currentOnlineTargetId = target.id;
      this.enemyBoard.reset();
      this.enemy = createFighter(target.name ?? "RIVAL");
      this.enemyPiece = null;
      this.enemyNext = null;
    }
    if (target.state) this.loadRemoteState(target.state);
    this.ui.updateOnlineTarget({
      name: target.name,
      avatar,
      aliveCount: target.aliveCount,
      totalPlayers: target.totalPlayers
    });
  }

  serializeLocal() {
    return {
      board: this.playerBoard.serialize(),
      currentPiece: this.playerPiece?.serialize() ?? null,
      nextPiece: this.playerNext?.serialize() ?? null,
      holdPiece: this.playerHold?.serialize() ?? null,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      shield: this.player.shield,
      junkQueue: this.player.junkQueue,
      focus: this.player.focus,
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
    if (this.mode === "online") {
      if (this.player.hp <= 0) {
        this.over = true;
        this.onNetworkSync?.(this.serializeLocal());
        this.onLocalEliminated?.();
      }
      return;
    }
    if (this.player.hp <= 0 || this.enemy.hp <= 0) {
      this.over = true;
      const won = this.enemy.hp <= 0 && this.player.hp > 0;
      this.onNetworkSync?.(this.serializeLocal());
      window.setTimeout(() => this.onGameOver?.(won, this.getBattleSummary(won)), 450);
    }
  }

  applyBattleRules(rules) {
    this.player.hp = rules.playerHp ?? this.player.hp;
    this.player.maxHp = this.player.hp;
    this.player.shield = rules.playerShield ?? 0;
    this.enemy.hp = rules.enemyHp ?? this.enemy.hp;
    this.enemy.maxHp = this.enemy.hp;
    this.enemy.shield = rules.enemyShield ?? 0;
    if (rules.playerJunk) this.playerBoard.addJunk(rules.playerJunk);
    if (rules.enemyJunk) this.enemyBoard.addJunk(rules.enemyJunk);
  }

  getBattleSummary(won = false) {
    return {
      ...this.stats,
      won,
      elapsedMs: Math.max(0, Date.now() - this.stats.startedAt),
      hpRemaining: Math.max(0, this.player.hp),
      maxHp: Math.max(1, this.player.maxHp),
      hpPercent: Math.max(0, this.player.hp) / Math.max(1, this.player.maxHp) * 100
    };
  }

  spellPowerFor(side, type) {
    const rules = this.options.rules ?? {};
    const base = side === "player" ? rules.playerPower ?? 1 : rules.enemyPower ?? 1;
    const runeBoosts = side === "player" ? rules.playerRuneBoost : rules.enemyRuneBoost;
    return base * (runeBoosts?.[type] ?? 1);
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
