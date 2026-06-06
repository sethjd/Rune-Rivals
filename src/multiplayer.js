import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";
import {
  availableSeat,
  disconnectedTooLong,
  eliminatePlayer,
  finishWhenOneRemains,
  livingPlayers,
  MAX_ROOM_PLAYERS,
  nextLivingTarget,
  roomPlayers
} from "./multiplayer-logic.js";

const FIREBASE_VERSION = "10.12.5";
const APP_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
const DB_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`;
const DISCONNECT_GRACE_MS = 15000;

export class MultiplayerClient {
  constructor() {
    this.roomCode = "";
    this.playerId = "";
    this.isHost = false;
    this.unsubscribers = [];
    this.disconnectTimers = new Map();
    this.processedAttacks = new Set();
    this.matchStarted = false;
    this.resultDelivered = false;
    this.currentTargetId = "";
    this.currentTargetState = null;
    this.sessionToken = 0;
    this.resetStateSync();
  }

  get configured() {
    return hasFirebaseConfig();
  }

  async initialize() {
    if (!this.configured) throw new Error("Firebase has not been configured yet.");
    if (this.db) return;

    const [{ initializeApp }, databaseModule] = await Promise.all([
      import(APP_URL),
      import(DB_URL)
    ]);
    this.api = databaseModule;
    this.db = databaseModule.getDatabase(initializeApp(firebaseConfig));
  }

  async createRoom(profile, handlers) {
    await this.initialize();
    this.leave();
    this.roomCode = makeRoomCode();
    this.playerId = makePlayerId();
    this.isHost = true;
    const { ref, set } = this.api;

    await set(ref(this.db, `rooms/${this.roomCode}`), {
      status: "waiting",
      hostId: this.playerId,
      createdAt: Date.now(),
      players: {
        [this.playerId]: playerRecord(profile, 1)
      }
    });

    this.armPresence();
    this.subscribeRoom(handlers);
    return this.roomCode;
  }

  async joinRoom(code, profile, handlers) {
    await this.initialize();
    this.leave();
    this.roomCode = code.trim().toUpperCase();
    this.playerId = makePlayerId();
    const { ref, get, runTransaction } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    const initial = await get(roomRef);
    if (!initial.exists()) throw new Error("That room does not exist.");
    if (initial.val().status !== "waiting") throw new Error("That match has already started.");
    const connectedPlayers = roomPlayers(initial.val()).filter((player) => player.connected !== false);
    if (connectedPlayers.length >= MAX_ROOM_PLAYERS) throw new Error("That room is full.");

    const result = await runTransaction(roomRef, (room) => {
      if (!room || room.status !== "waiting") return;
      const seat = availableSeat(room);
      if (!seat) return;
      room.players ??= {};
      room.players[this.playerId] = playerRecord(profile, seat);
      return room;
    });
    if (!result.committed) throw new Error("The room filled up or started while you were joining.");

    this.armPresence();
    this.subscribeRoom(handlers);
    return this.roomCode;
  }

  armPresence() {
    const { ref, onValue, onDisconnect: markDisconnect, update, serverTimestamp } = this.api;
    const token = this.sessionToken;
    const presenceRef = ref(this.db, ".info/connected");

    this.unsubscribers.push(onValue(presenceRef, (snapshot) => {
      if (!snapshot.val() || token !== this.sessionToken || !this.roomCode || !this.playerId) return;
      const playerRef = ref(this.db, `rooms/${this.roomCode}/players/${this.playerId}`);
      markDisconnect(playerRef).update({
        connected: false,
        disconnectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(() => {});
      update(playerRef, {
        connected: true,
        disconnectedAt: null,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }));
  }

  subscribeRoom(handlers) {
    const { ref, onValue, onChildAdded, remove } = this.api;
    const token = this.sessionToken;
    const roomPath = `rooms/${this.roomCode}`;
    const attacksRef = ref(this.db, `${roomPath}/attacks/${this.playerId}`);
    this.handlers = handlers;
    this.roomMeta = {
      status: undefined,
      hostId: undefined,
      playerCount: undefined,
      winnerId: undefined,
      players: undefined
    };

    const watch = (key) => {
      const watchedRef = ref(this.db, `${roomPath}/${key}`);
      this.unsubscribers.push(onValue(watchedRef, (snapshot) => {
        if (token !== this.sessionToken) return;
        this.roomMeta[key] = key === "players" ? (snapshot.val() ?? {}) : snapshot.val();
        if (key === "status" && this.roomMeta.status === null) {
          if (!this.roomClosedDelivered) handlers.onRoomClosed?.();
          this.roomClosedDelivered = true;
          return;
        }
        this.scheduleRoomProcessing();
      }));
    };

    for (const key of ["status", "hostId", "playerCount", "winnerId", "players"]) watch(key);

    this.unsubscribers.push(onChildAdded(attacksRef, (snapshot) => {
      if (token !== this.sessionToken) return;
      const attackId = snapshot.key;
      if (this.processedAttacks.has(attackId)) {
        remove(snapshot.ref).catch(() => {});
        return;
      }
      this.processedAttacks.add(attackId);
      if (this.processedAttacks.size > 200) {
        this.processedAttacks.delete(this.processedAttacks.values().next().value);
      }
      Promise.resolve()
        .then(() => handlers.onAttack?.(snapshot.val()))
        .catch((error) => console.error("Could not apply online attack.", error))
        .finally(() => remove(snapshot.ref).catch(() => {}));
    }));
  }

  scheduleRoomProcessing() {
    if (this.roomProcessingScheduled) return;
    this.roomProcessingScheduled = true;
    queueMicrotask(() => {
      this.roomProcessingScheduled = false;
      this.processRoom();
    });
  }

  processRoom() {
    if (!this.roomMeta || this.roomMeta.status == null || this.roomMeta.players === undefined) return;
    const room = {
      status: this.roomMeta.status,
      hostId: this.roomMeta.hostId,
      playerCount: this.roomMeta.playerCount,
      winnerId: this.roomMeta.winnerId,
      players: this.roomMeta.players
    };

    this.latestRoom = room;
    this.isHost = room.hostId === this.playerId;
    this.ensureWaitingHost(room).catch(() => {});
    this.handlers?.onLobby?.(this.roomView(room));
    this.manageDisconnectedPlayers(room);

    if (room.status === "playing" || room.status === "finished") {
      if (!this.matchStarted) {
        this.matchStarted = true;
        this.handlers?.onStarted?.(this.roomView(room));
      }
      this.deliverTarget(room);
      this.deliverResult(room);
      this.finishIfLastAlive(room);
    }
  }

  async startMatch() {
    if (!this.db || !this.roomCode || !this.isHost) throw new Error("Only the host can start the match.");
    const { ref, runTransaction } = this.api;
    const result = await runTransaction(ref(this.db, `rooms/${this.roomCode}`), (room) => {
      if (!room || room.status !== "waiting" || room.hostId !== this.playerId) return;
      const players = roomPlayers(room).filter((player) => player.connected !== false);
      if (players.length < 2) return;
      const activeIds = new Set(players.map((player) => player.id));
      room.status = "playing";
      room.startedAt = Date.now();
      room.playerCount = players.length;
      room.winnerId = null;
      room.states = null;
      room.attacks = null;
      for (const player of roomPlayers(room)) {
        room.players[player.id].alive = activeIds.has(player.id);
        room.players[player.id].placement = null;
      }
      return room;
    });
    if (!result.committed) throw new Error("At least two connected players are needed to start.");
  }

  async syncState(state) {
    if (!this.db || !this.roomCode || !this.playerId || !this.matchStarted) return;
    const fingerprint = stateFingerprint(state);
    if (fingerprint === this.lastSentStateFingerprint || fingerprint === this.pendingState?.fingerprint) {
      return this.stateSyncPromise;
    }

    this.pendingState = { state, fingerprint };
    if (!this.stateSyncPromise) {
      this.stateSyncPromise = this.flushStateSync().finally(() => {
        this.stateSyncPromise = null;
      });
    }
    return this.stateSyncPromise;
  }

  async flushStateSync() {
    const token = this.sessionToken;
    const roomCode = this.roomCode;
    const playerId = this.playerId;
    const { ref, set } = this.api;

    while (this.pendingState && token === this.sessionToken) {
      const next = this.pendingState;
      this.pendingState = null;
      await set(ref(this.db, `rooms/${roomCode}/states/${playerId}`), {
        ...next.state,
        updatedAt: Date.now()
      });
      this.lastSentStateFingerprint = next.fingerprint;
    }
  }

  async sendAttack(attack) {
    if (!this.db || !this.roomCode || !this.playerId) return;
    const target = nextLivingTarget(this.latestRoom, this.playerId);
    if (!target) return;
    const { ref, push } = this.api;
    await push(ref(this.db, `rooms/${this.roomCode}/attacks/${target.id}`), {
      ...attack,
      attackerId: this.playerId,
      attackerName: this.latestRoom?.players?.[this.playerId]?.name ?? "Rival",
      sentAt: Date.now()
    });
  }

  async reportElimination() {
    if (!this.db || !this.roomCode || !this.playerId) return;
    await this.eliminatePlayerById(this.playerId);
  }

  deliverTarget(room) {
    const self = room.players?.[this.playerId];
    if (!self || self.alive === false || room.status === "finished") {
      this.unsubscribeTargetState();
      return;
    }
    const target = nextLivingTarget(room, this.playerId);
    if (!target) return;
    const changed = target.id !== this.currentTargetId;

    if (changed) {
      this.unsubscribeTargetState();
      this.currentTargetId = target.id;
      this.currentTargetState = null;
      this.subscribeTargetState(target.id);
    }
    this.emitTarget(target, changed);
  }

  subscribeTargetState(targetId) {
    const { ref, onValue } = this.api;
    const token = this.sessionToken;
    const targetRef = ref(this.db, `rooms/${this.roomCode}/states/${targetId}`);
    this.targetStateUnsubscribe = onValue(targetRef, (snapshot) => {
      if (token !== this.sessionToken || targetId !== this.currentTargetId) return;
      this.currentTargetState = snapshot.val();
      const target = this.latestRoom?.players?.[targetId];
      if (target) this.emitTarget({ id: targetId, ...target }, false);
    });
  }

  emitTarget(target, changed) {
    const room = this.latestRoom;
    if (!room) return;
    this.handlers?.onTarget?.({
      ...target,
      state: this.currentTargetState,
      changed,
      aliveCount: livingPlayers(room).length,
      totalPlayers: room.playerCount ?? roomPlayers(room).length
    });
  }

  unsubscribeTargetState() {
    this.targetStateUnsubscribe?.();
    this.targetStateUnsubscribe = null;
    this.currentTargetId = "";
    this.currentTargetState = null;
  }

  deliverResult(room) {
    if (this.resultDelivered) return;
    const self = room.players?.[this.playerId];
    if (!self?.placement) return;
    this.resultDelivered = true;
    this.handlers?.onResult?.({
      place: self.placement,
      totalPlayers: room.playerCount ?? roomPlayers(room).length,
      won: self.placement === 1
    });
  }

  manageDisconnectedPlayers(room) {
    const activeIds = new Set();
    for (const player of roomPlayers(room)) {
      if (room.status !== "playing" || player.connected !== false || player.alive === false) continue;
      activeIds.add(player.id);
      if (this.disconnectTimers.has(player.id)) continue;
      const elapsed = Date.now() - Number(player.disconnectedAt || Date.now());
      const delay = Math.max(0, DISCONNECT_GRACE_MS - elapsed);
      const timer = window.setTimeout(() => {
        this.disconnectTimers.delete(player.id);
        this.eliminateDisconnectedPlayer(player.id).catch(() => {});
      }, delay);
      this.disconnectTimers.set(player.id, timer);
    }

    for (const [playerId, timer] of this.disconnectTimers) {
      if (activeIds.has(playerId)) continue;
      window.clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }
  }

  async eliminateDisconnectedPlayer(playerId) {
    if (!this.db || !this.roomCode) return;
    const { ref, runTransaction } = this.api;
    await runTransaction(ref(this.db, `rooms/${this.roomCode}`), (room) => {
      const player = room?.players?.[playerId];
      if (!disconnectedTooLong(player, Date.now(), DISCONNECT_GRACE_MS)) return room;
      return eliminatePlayer(room, playerId);
    });
  }

  async eliminatePlayerById(playerId) {
    const { ref, runTransaction } = this.api;
    await runTransaction(ref(this.db, `rooms/${this.roomCode}`), (room) => {
      return eliminatePlayer(room, playerId);
    });
  }

  async finishIfLastAlive(room) {
    if (room.status !== "playing" || this.finishingRoom) return;
    const remaining = livingPlayers(room);
    if (remaining.length !== 1 || remaining[0].id !== this.playerId) return;
    this.finishingRoom = true;
    const { ref, runTransaction } = this.api;
    try {
      await runTransaction(ref(this.db, `rooms/${this.roomCode}`), (current) => {
        if (!current || current.status !== "playing") return current;
        return finishWhenOneRemains(current);
      });
    } finally {
      this.finishingRoom = false;
    }
  }

  async ensureWaitingHost(room) {
    if (room.status !== "waiting" || this.transferringHost) return;
    const host = room.players?.[room.hostId];
    if (host?.connected !== false) return;
    const nextHost = roomPlayers(room).find((player) => player.connected !== false);
    if (!nextHost || nextHost.id !== this.playerId) return;

    this.transferringHost = true;
    const { ref, runTransaction } = this.api;
    try {
      await runTransaction(ref(this.db, `rooms/${this.roomCode}`), (current) => {
        if (!current || current.status !== "waiting") return current;
        const currentHost = current.players?.[current.hostId];
        if (currentHost?.connected !== false) return current;
        const replacement = roomPlayers(current).find((player) => player.connected !== false);
        if (replacement) current.hostId = replacement.id;
        return current;
      });
    } finally {
      this.transferringHost = false;
    }
  }

  roomView(room) {
    const players = room.status === "waiting"
      ? roomPlayers(room).filter((player) => player.connected !== false)
      : roomPlayers(room);
    return {
      roomCode: this.roomCode,
      playerId: this.playerId,
      hostId: room.hostId,
      isHost: room.hostId === this.playerId,
      status: room.status,
      players,
      aliveCount: livingPlayers(room).length,
      totalPlayers: room.playerCount ?? players.length
    };
  }

  leave() {
    const roomCode = this.roomCode;
    const playerId = this.playerId;
    const roomStatus = this.latestRoom?.status;
    const playerRef = this.db && roomCode && playerId
      ? this.api.ref(this.db, `rooms/${roomCode}/players/${playerId}`)
      : null;

    this.sessionToken += 1;
    for (const unsubscribe of this.unsubscribers) unsubscribe?.();
    this.unsubscribers = [];
    this.unsubscribeTargetState();
    for (const timer of this.disconnectTimers.values()) window.clearTimeout(timer);
    this.disconnectTimers.clear();

    if (playerRef) {
      this.api.onDisconnect(playerRef).cancel().catch(() => {});
      if (roomStatus === "playing") {
        this.api.runTransaction(this.api.ref(this.db, `rooms/${roomCode}`), (room) => {
          if (!room?.players?.[playerId]) return room;
          room.players[playerId].connected = false;
          room.players[playerId].disconnectedAt = Date.now();
          return eliminatePlayer(room, playerId);
        }).catch(() => {});
      } else {
        this.api.update(playerRef, {
          connected: false,
          alive: false,
          disconnectedAt: Date.now(),
          updatedAt: Date.now()
        }).catch(() => {});
      }
    }

    this.roomCode = "";
    this.playerId = "";
    this.isHost = false;
    this.latestRoom = null;
    this.handlers = null;
    this.roomMeta = null;
    this.roomClosedDelivered = false;
    this.matchStarted = false;
    this.resultDelivered = false;
    this.processedAttacks.clear();
    this.resetStateSync();
  }

  resetStateSync() {
    this.pendingState = null;
    this.stateSyncPromise = null;
    this.lastSentStateFingerprint = "";
  }
}

function stateFingerprint(state) {
  if (!state) return "";
  const { updatedAt, ...stableState } = state;
  return JSON.stringify(stableState);
}

function playerRecord(profile, seat) {
  return {
    name: String(profile?.name || "Player").slice(0, 16),
    avatarId: profile?.avatarId || "violet-hood",
    seat,
    connected: true,
    alive: true,
    placement: null,
    joinedAt: Date.now(),
    updatedAt: Date.now()
  };
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function makePlayerId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
