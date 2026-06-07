export const MAX_ROOM_PLAYERS = 6;
export const PUBLIC_LOBBY_MAX_AGE_MS = 3 * 60 * 1000;

export function roomPlayers(room) {
  return Object.entries(room?.players ?? {})
    .map(([id, player]) => ({ id, ...player }))
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
}

export function livingPlayers(room) {
  return roomPlayers(room).filter((player) => player.alive !== false);
}

export function nextLivingTarget(room, playerId) {
  const ordered = roomPlayers(room);
  const selfIndex = ordered.findIndex((player) => player.id === playerId);
  if (selfIndex < 0) return null;

  for (let offset = 1; offset < ordered.length; offset += 1) {
    const candidate = ordered[(selfIndex + offset) % ordered.length];
    if (candidate.alive !== false) return candidate;
  }
  return null;
}

export function disconnectedTooLong(player, now = Date.now(), graceMs = 15000) {
  if (!player || player.connected !== false || player.alive === false) return false;
  const disconnectedAt = Number(player.disconnectedAt);
  return Number.isFinite(disconnectedAt) && now - disconnectedAt >= graceMs;
}

export function availableSeat(room) {
  const occupied = new Set(
    roomPlayers(room)
      .filter((player) => player.connected !== false)
      .map((player) => player.seat)
  );
  for (let seat = 1; seat <= MAX_ROOM_PLAYERS; seat += 1) {
    if (!occupied.has(seat)) return seat;
  }
  return null;
}

export function buildPublicLobbyListing(roomCode, room, timestamp = Date.now()) {
  if (!room || room.status !== "waiting" || room.visibility !== "public") return null;
  const players = roomPlayers(room).filter((player) => player.connected !== false);
  const host = room.players?.[room.hostId];
  if (!host || host.connected === false || !host.authUid) return null;
  return {
    roomCode: String(roomCode || "").toUpperCase().slice(0, 6),
    hostId: String(room.hostId || "").slice(0, 32),
    hostUid: String(host.authUid || ""),
    hostName: String(host.name || "Player").trim().slice(0, 16) || "Player",
    hostAvatarId: String(host.avatarId || "violet-hood").slice(0, 32),
    playerCount: Math.max(1, Math.min(MAX_ROOM_PLAYERS, players.length)),
    maxPlayers: MAX_ROOM_PLAYERS,
    status: "waiting",
    createdAt: Math.max(0, Number(room.createdAt || timestamp)),
    updatedAt: Math.max(0, Number(timestamp))
  };
}

export function normalizePublicLobbyListings(
  value,
  now = Date.now(),
  maxAge = PUBLIC_LOBBY_MAX_AGE_MS
) {
  return Object.entries(value && typeof value === "object" ? value : {})
    .map(([key, lobby]) => normalizePublicLobby(key, lobby))
    .filter((lobby) => (
      lobby.roomCode.length === 6 &&
      lobby.status === "waiting" &&
      lobby.playerCount >= 1 &&
      lobby.playerCount < lobby.maxPlayers &&
      lobby.updatedAt >= now - maxAge
    ))
    .sort((a, b) => (
      b.playerCount - a.playerCount ||
      b.updatedAt - a.updatedAt ||
      a.hostName.localeCompare(b.hostName)
    ));
}

export function placementForElimination(room) {
  return livingPlayers(room).length;
}

export function eliminatePlayer(room, playerId, timestamp = Date.now()) {
  const self = room?.players?.[playerId];
  if (!room || room.status !== "playing" || !self || self.alive === false) return room;

  const activeBefore = livingPlayers(room);
  self.alive = false;
  self.placement = activeBefore.length;
  self.eliminatedAt = timestamp;
  return finishWhenOneRemains(room, timestamp);
}

export function finishWhenOneRemains(room, timestamp = Date.now()) {
  if (!room || room.status !== "playing") return room;
  const remaining = livingPlayers(room);
  if (remaining.length === 1) {
    const winner = remaining[0];
    room.players[winner.id].placement = 1;
    room.winnerId = winner.id;
    room.status = "finished";
    room.finishedAt = timestamp;
  }
  return room;
}

export function ordinal(number) {
  const value = Number(number);
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function normalizePublicLobby(key, value = {}) {
  const lobby = value && typeof value === "object" ? value : {};
  return {
    roomCode: String(lobby.roomCode || key || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
    hostId: String(lobby.hostId || "").slice(0, 32),
    hostName: String(lobby.hostName || "Player").trim().slice(0, 16) || "Player",
    hostAvatarId: String(lobby.hostAvatarId || "violet-hood").slice(0, 32),
    playerCount: Math.max(0, Math.round(Number(lobby.playerCount) || 0)),
    maxPlayers: Math.max(2, Math.min(MAX_ROOM_PLAYERS, Math.round(Number(lobby.maxPlayers) || MAX_ROOM_PLAYERS))),
    status: String(lobby.status || ""),
    createdAt: Math.max(0, Number(lobby.createdAt) || 0),
    updatedAt: Math.max(0, Number(lobby.updatedAt) || 0)
  };
}
