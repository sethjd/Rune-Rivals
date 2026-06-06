export const MAX_ROOM_PLAYERS = 6;

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
