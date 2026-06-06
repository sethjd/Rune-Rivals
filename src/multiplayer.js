import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

const FIREBASE_VERSION = "10.12.5";
const APP_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
const DB_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`;

export class MultiplayerClient {
  constructor() {
    this.roomCode = "";
    this.role = "";
    this.unsubscribers = [];
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

  async createRoom({ onReady, onRemoteState, onAttack, onDisconnect }) {
    await this.initialize();
    this.leave();
    this.role = "host";
    this.roomCode = makeRoomCode();
    const { ref, set, onValue, onDisconnect: markDisconnect } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    const playerRef = ref(this.db, `rooms/${this.roomCode}/players/host`);

    await set(roomRef, {
      status: "waiting",
      createdAt: Date.now(),
      players: {
        host: { connected: true, ready: true, updatedAt: Date.now() }
      }
    });
    await markDisconnect(ref(this.db, `rooms/${this.roomCode}/players/host/connected`)).set(false);

    let started = false;
    this.unsubscribers.push(onValue(roomRef, (snapshot) => {
      const room = snapshot.val();
      if (!room) return onDisconnect?.();
      if (!started && room.players?.guest?.connected) {
        started = true;
        set(ref(this.db, `rooms/${this.roomCode}/status`), "playing");
        this.subscribeToMatch("guest", onRemoteState, onAttack, onDisconnect);
        onReady?.(this.roomCode);
      }
      if (started && room.players?.guest?.connected === false) onDisconnect?.();
    }));

    return this.roomCode;
  }

  async joinRoom(code, { onReady, onRemoteState, onAttack, onDisconnect }) {
    await this.initialize();
    this.leave();
    this.role = "guest";
    this.roomCode = code.trim().toUpperCase();
    const { ref, get, update, onDisconnect: markDisconnect } = this.api;
    const roomRef = ref(this.db, `rooms/${this.roomCode}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error("That room does not exist.");
    if (snapshot.val().players?.guest?.connected) throw new Error("That room already has two players.");

    await update(ref(this.db, `rooms/${this.roomCode}/players/guest`), {
      connected: true,
      ready: true,
      updatedAt: Date.now()
    });
    await markDisconnect(ref(this.db, `rooms/${this.roomCode}/players/guest/connected`)).set(false);
    this.subscribeToMatch("host", onRemoteState, onAttack, onDisconnect);
    onReady?.(this.roomCode);
    return this.roomCode;
  }

  subscribeToMatch(opponentRole, onRemoteState, onAttack, onDisconnect) {
    const { ref, onValue, onChildAdded, remove } = this.api;
    const opponentRef = ref(this.db, `rooms/${this.roomCode}/players/${opponentRole}`);
    const attacksRef = ref(this.db, `rooms/${this.roomCode}/players/${this.role}/attacks`);

    this.unsubscribers.push(onValue(opponentRef, (snapshot) => {
      const state = snapshot.val();
      if (state?.connected === false) onDisconnect?.();
      if (state?.state) onRemoteState?.(state.state);
    }));

    this.unsubscribers.push(onChildAdded(attacksRef, (snapshot) => {
      onAttack?.(snapshot.val());
      remove(snapshot.ref);
    }));
  }

  async syncState(state) {
    if (!this.db || !this.roomCode || !this.role) return;
    const { ref, set } = this.api;
    await set(ref(this.db, `rooms/${this.roomCode}/players/${this.role}/state`), state);
  }

  async sendAttack(attack) {
    if (!this.db || !this.roomCode) return;
    const opponent = this.role === "host" ? "guest" : "host";
    const { ref, push } = this.api;
    await push(ref(this.db, `rooms/${this.roomCode}/players/${opponent}/attacks`), {
      ...attack,
      sentAt: Date.now()
    });
  }

  leave() {
    for (const unsubscribe of this.unsubscribers) unsubscribe?.();
    this.unsubscribers = [];
    if (this.db && this.roomCode && this.role) {
      const { ref, update } = this.api;
      update(ref(this.db, `rooms/${this.roomCode}/players/${this.role}`), {
        connected: false,
        updatedAt: Date.now()
      }).catch(() => {});
    }
    this.roomCode = "";
    this.role = "";
  }
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
