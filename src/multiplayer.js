import { hasFirebaseConfig } from "./firebase-config.js";
import { initializeFirebase } from "./firebase.js";
import {
  buildPublicLobbyListing,
  disconnectedTooLong,
  eliminatePlayer,
  finishWhenOneRemains,
  livingPlayers,
  MAX_ROOM_PLAYERS,
  nextLivingTarget,
  normalizePublicLobbyListings,
  roomPlayers
} from "./multiplayer-logic.js";

const DISCONNECT_GRACE_MS = 15000;
const ROOM_TRANSACTION_ATTEMPTS = 5;
const PUBLIC_LOBBY_HEARTBEAT_MS = 45000;
const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

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
    this.lastPublicLobbyFingerprint = "";
    this.resetStateSync();
  }

  get configured() {
    return hasFirebaseConfig();
  }

  async initialize() {
    if (!this.configured) throw new Error("Firebase has not been configured yet.");
    if (this.db) return;
    const { db, databaseModule, user } = await initializeFirebase({ authenticate: true });
    this.api = databaseModule;
    this.db = db;
    this.authUid = user.uid;
  }

  async createRoom(profile, handlers, { visibility = "public" } = {}) {
    await this.initialize();
    this.leave();
    this.roomCode = makeRoomCode();
    this.playerId = makePlayerId();
    this.playerSeat = 1;
    this.isHost = true;
    const { ref, set, remove } = this.api;
    const room = {
      status: "waiting",
      visibility: visibility === "private" ? "private" : "public",
      hostId: this.playerId,
      createdAt: Date.now(),
      seats: {
        1: this.playerId
      },
      players: {
        [this.playerId]: playerRecord(profile, 1, this.authUid)
      }
    };

    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    await set(roomRef, room);
    if (room.visibility === "public") {
      try {
        await set(
          ref(this.db, `publicLobbies/${this.roomCode}`),
          buildPublicLobbyListing(this.roomCode, room)
        );
      } catch (error) {
        await remove(roomRef).catch(() => {});
        throw error;
      }
    }

    this.armPresence();
    this.subscribeRoom(handlers);
    return this.roomCode;
  }

  async listPublicLobbies() {
    await this.initialize();
    const { ref, query, orderByChild, limitToLast, get } = this.api;
    const lobbyQuery = query(
      ref(this.db, "publicLobbies"),
      orderByChild("updatedAt"),
      limitToLast(50)
    );
    const snapshot = await get(lobbyQuery);
    return normalizePublicLobbyListings(snapshot.val());
  }

  async joinRoom(code, profile, handlers) {
    await this.initialize();
    this.leave();
    this.roomCode = code.trim().toUpperCase();
    this.playerId = makePlayerId();
    const { ref, get, set, remove } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    const initial = await get(roomRef);
    if (!initial.exists()) {
      this.clearFailedJoin();
      throw new Error("That room does not exist.");
    }
    const initialRoom = initial.val();
    if (initialRoom.status !== "waiting") {
      this.clearFailedJoin();
      throw new Error("That match has already started.");
    }
    const connectedPlayers = roomPlayers(initialRoom).filter((player) => player.connected !== false);
    if (connectedPlayers.length >= MAX_ROOM_PLAYERS) {
      this.clearFailedJoin();
      throw new Error("That room is full.");
    }

    const seat = await this.claimOpenSeat(initialRoom);
    if (!seat) {
      this.clearFailedJoin();
      throw new Error("That room is full.");
    }
    this.playerSeat = seat;
    const playerRef = ref(this.db, `rooms/${this.roomCode}/players/${this.playerId}`);

    try {
      await set(playerRef, playerRecord(profile, seat, this.authUid));
      const confirmed = await get(roomRef);
      const confirmedRoom = confirmed.val();
      if (!confirmedRoom || confirmedRoom.status !== "waiting") {
        await remove(playerRef);
        await this.releaseSeatClaim();
        throw new Error("That match started while you were joining.");
      }
      const confirmedPlayers = roomPlayers(confirmedRoom).filter((player) => player.connected !== false);
      if (!confirmedRoom.players?.[this.playerId] || confirmedPlayers.length > MAX_ROOM_PLAYERS) {
        await remove(playerRef);
        await this.releaseSeatClaim();
        throw new Error("That room became full while you were joining.");
      }
    } catch (error) {
      if (this.playerSeat) await this.releaseSeatClaim().catch(() => {});
      this.clearFailedJoin();
      throw error;
    }

    this.armPresence();
    this.subscribeRoom(handlers);
    return this.roomCode;
  }

  async claimOpenSeat(room) {
    const { ref, runTransaction } = this.api;
    const connectedSeats = new Set(
      roomPlayers(room)
        .filter((player) => player.connected !== false)
        .map((player) => player.seat)
    );

    for (let seat = 1; seat <= MAX_ROOM_PLAYERS; seat += 1) {
      if (connectedSeats.has(seat)) continue;
      const observedOwner = room.seats?.[seat] ?? null;
      const observedPlayer = observedOwner ? room.players?.[observedOwner] : null;
      const replaceableOwner = observedPlayer?.connected === false || !observedPlayer
        ? observedOwner
        : null;
      const claimRef = ref(this.db, `rooms/${this.roomCode}/seats/${seat}`);
      const result = await runTransaction(claimRef, (currentOwner) => {
        if (currentOwner == null || currentOwner === replaceableOwner) return this.playerId;
        return;
      });
      if (result.committed && result.snapshot.val() === this.playerId) return seat;
    }
    return null;
  }

  async releaseSeatClaim() {
    if (!this.db || !this.roomCode || !this.playerId || !this.playerSeat) return;
    const { ref, runTransaction } = this.api;
    const ownerId = this.playerId;
    const seat = this.playerSeat;
    const claimRef = ref(this.db, `rooms/${this.roomCode}/seats/${seat}`);
    await runTransaction(claimRef, (currentOwner) => {
      return currentOwner === ownerId ? null : currentOwner;
    });
    if (this.playerId === ownerId) this.playerSeat = null;
  }

  clearFailedJoin() {
    this.roomCode = "";
    this.playerId = "";
    this.playerSeat = null;
    this.isHost = false;
    this.latestRoom = null;
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
      visibility: undefined,
      createdAt: undefined,
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

    for (const key of ["status", "visibility", "createdAt", "hostId", "playerCount", "winnerId", "finishedAt", "players"]) watch(key);

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
      visibility: this.roomMeta.visibility ?? "private",
      createdAt: this.roomMeta.createdAt,
      hostId: this.roomMeta.hostId,
      playerCount: this.roomMeta.playerCount,
      winnerId: this.roomMeta.winnerId,
      finishedAt: this.roomMeta.finishedAt,
      players: this.roomMeta.players
    };

    this.latestRoom = room;
    this.isHost = room.hostId === this.playerId;
    this.ensureWaitingHost(room).catch(() => {});
    this.managePublicLobby(room);
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
    const { ref, get, update } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    if (!room || room.status !== "waiting") throw new Error("That match has already started.");
    if (room.hostId !== this.playerId) throw new Error("Only the host can start the match.");

    const players = roomPlayers(room).filter((player) => player.connected !== false);
    if (players.length < 2) throw new Error("At least two connected players are needed to start.");

    const activeIds = new Set(players.map((player) => player.id));
    const roomPath = `rooms/${this.roomCode}`;
    const updates = {
      [`${roomPath}/status`]: "playing",
      [`${roomPath}/startedAt`]: Date.now(),
      [`${roomPath}/playerCount`]: players.length,
      [`${roomPath}/winnerId`]: null,
      [`${roomPath}/states`]: null,
      [`${roomPath}/attacks`]: null,
      [`publicLobbies/${this.roomCode}`]: null
    };
    for (const player of roomPlayers(room)) {
      updates[`${roomPath}/players/${player.id}/alive`] = activeIds.has(player.id);
      updates[`${roomPath}/players/${player.id}/placement`] = null;
    }
    await update(ref(this.db), updates);
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
    try {
      await this.runRoomTransaction((room) => {
        return eliminatePlayer(room, this.playerId);
      }, 12);
    } catch (error) {
      await this.forceEliminationUpdate(this.playerId);
    }
  }

  async forceEliminationUpdate(playerId) {
    const { ref, get, update } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    if (!room) throw new Error("The online room was closed.");
    const updatedRoom = eliminatePlayer(room, playerId);
    const updates = {};

    for (const player of roomPlayers(updatedRoom)) {
      updates[`players/${player.id}/alive`] = player.alive !== false;
      updates[`players/${player.id}/placement`] = player.placement ?? null;
      updates[`players/${player.id}/eliminatedAt`] = player.eliminatedAt ?? null;
    }
    updates.status = updatedRoom.status;
    updates.winnerId = updatedRoom.winnerId ?? null;
    updates.finishedAt = updatedRoom.finishedAt ?? null;
    await update(roomRef, updates);
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
    const resultAt = self?.placement === 1 ? room.finishedAt : self?.eliminatedAt;
    if (!self?.placement || !resultAt || !room.playerCount) return;
    this.resultDelivered = true;
    this.handlers?.onResult?.({
      place: self.placement,
      totalPlayers: room.playerCount ?? roomPlayers(room).length,
      won: self.placement === 1,
      roomCode: this.roomCode,
      playerId: this.playerId,
      finishedAt: resultAt
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
    await this.runRoomTransaction((room) => {
      const player = room?.players?.[playerId];
      if (!disconnectedTooLong(player, Date.now(), DISCONNECT_GRACE_MS)) return room;
      return eliminatePlayer(room, playerId);
    });
  }

  async eliminatePlayerById(playerId) {
    await this.runRoomTransaction((room) => {
      return eliminatePlayer(room, playerId);
    });
  }

  async finishIfLastAlive(room) {
    if (room.status !== "playing" || this.finishingRoom) return;
    const remaining = livingPlayers(room);
    if (remaining.length !== 1 || remaining[0].id !== this.playerId) return;
    this.finishingRoom = true;
    try {
      await this.runRoomTransaction((current) => {
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
    try {
      await this.runRoomTransaction((current) => {
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

  managePublicLobby(room) {
    const shouldPublish = (
      room.visibility === "public" &&
      room.status === "waiting" &&
      this.isHost
    );
    if (shouldPublish) {
      this.syncPublicLobby(room).catch(() => {});
      this.startPublicLobbyHeartbeat();
    } else {
      this.stopPublicLobbyHeartbeat();
      if (this.isHost && room.visibility === "public") this.removePublicLobby().catch(() => {});
    }
  }

  async syncPublicLobby(room = this.latestRoom, force = false) {
    if (!this.db || !this.roomCode || !this.isHost) return;
    const listing = buildPublicLobbyListing(this.roomCode, room);
    if (!listing) return;
    const fingerprint = JSON.stringify({ ...listing, updatedAt: 0 });
    if (!force && fingerprint === this.lastPublicLobbyFingerprint) return;
    this.lastPublicLobbyFingerprint = fingerprint;
    listing.updatedAt = Date.now();
    await this.api.set(
      this.api.ref(this.db, `publicLobbies/${this.roomCode}`),
      listing
    );
  }

  async removePublicLobby(roomCode = this.roomCode) {
    if (!this.db || !roomCode) return;
    await this.api.remove(this.api.ref(this.db, `publicLobbies/${roomCode}`));
  }

  startPublicLobbyHeartbeat() {
    if (this.publicLobbyHeartbeat) return;
    this.publicLobbyHeartbeat = globalThis.setInterval(() => {
      this.syncPublicLobby(this.latestRoom, true).catch(() => {});
    }, PUBLIC_LOBBY_HEARTBEAT_MS);
  }

  stopPublicLobbyHeartbeat() {
    if (!this.publicLobbyHeartbeat) return;
    globalThis.clearInterval(this.publicLobbyHeartbeat);
    this.publicLobbyHeartbeat = null;
  }

  async runRoomTransaction(updateRoom, attempts = ROOM_TRANSACTION_ATTEMPTS) {
    if (!this.db || !this.roomCode) throw new Error("The online room is no longer available.");
    const { ref, get, runTransaction } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const latest = await get(roomRef);
        if (!latest.exists()) throw new Error("The online room was closed.");
        let receivedRoom = false;
        const result = await runTransaction(roomRef, (room) => {
          if (!room) return;
          receivedRoom = true;
          return updateRoom(room);
        }, { applyLocally: false });
        if (result.committed) return result.snapshot.val();
        lastError = new Error(receivedRoom
          ? "The room changed while the match was updating."
          : "The latest room state was not ready.");
      } catch (error) {
        lastError = error;
      }
      await wait(180 * (attempt + 1));
    }

    throw lastError ?? new Error("The match could not be updated.");
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
      visibility: room.visibility ?? "private",
      players,
      aliveCount: livingPlayers(room).length,
      totalPlayers: room.playerCount ?? players.length
    };
  }

  leave() {
    const roomCode = this.roomCode;
    const playerId = this.playerId;
    const roomStatus = this.latestRoom?.status;
    const roomVisibility = this.latestRoom?.visibility;
    const wasHost = this.isHost;
    const playerRef = this.db && roomCode && playerId
      ? this.api.ref(this.db, `rooms/${roomCode}/players/${playerId}`)
      : null;

    this.sessionToken += 1;
    this.stopPublicLobbyHeartbeat();
    for (const unsubscribe of this.unsubscribers) unsubscribe?.();
    this.unsubscribers = [];
    this.unsubscribeTargetState();
    for (const timer of this.disconnectTimers.values()) window.clearTimeout(timer);
    this.disconnectTimers.clear();

    if (playerRef) {
      if (wasHost && roomStatus === "waiting" && roomVisibility === "public") {
        this.removePublicLobby(roomCode).catch(() => {});
      }
      this.api.onDisconnect(playerRef).cancel().catch(() => {});
      if (roomStatus === "playing") {
        const activeRoomCode = this.roomCode;
        this.runRoomTransaction((room) => {
          if (!room?.players?.[playerId]) return room;
          room.players[playerId].connected = false;
          room.players[playerId].disconnectedAt = Date.now();
          return eliminatePlayer(room, playerId);
        }).catch(() => {
          if (this.roomCode === activeRoomCode) {
            this.api.update(playerRef, {
              connected: false,
              disconnectedAt: Date.now(),
              updatedAt: Date.now()
            }).catch(() => {});
          }
        });
      } else {
        this.releaseSeatClaim().catch(() => {});
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
    this.playerSeat = null;
    this.isHost = false;
    this.latestRoom = null;
    this.handlers = null;
    this.roomMeta = null;
    this.roomClosedDelivered = false;
    this.matchStarted = false;
    this.resultDelivered = false;
    this.processedAttacks.clear();
    this.lastPublicLobbyFingerprint = "";
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

function playerRecord(profile, seat, authUid) {
  return {
    name: String(profile?.name || "Player").slice(0, 16),
    avatarId: profile?.avatarId || "violet-hood",
    seat,
    connected: true,
    alive: true,
    placement: null,
    authUid,
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
