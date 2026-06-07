import { initializeFirebase } from "./firebase.js";
import { mageRank } from "./profile.js";

const PENDING_RESULTS_KEY = "rune-rivals-pending-league-v1";
const SUBMIT_ATTEMPTS = 5;
const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

export class LeaderboardClient {
  constructor() {
    this.userId = "";
  }

  async fetch(profile) {
    const { db, databaseModule, user } = await initializeFirebase({ authenticate: true });
    this.userId = user.uid;
    const leaderboardRef = databaseModule.ref(db, "leaderboard");
    const topQuery = databaseModule.query(
      leaderboardRef,
      databaseModule.orderByChild("leaguePoints")
    );
    const snapshot = await databaseModule.get(topQuery);
    const entries = [];
    snapshot.forEach((child) => entries.push(normalizeEntry(child.key, child.val())));
    entries.sort(compareEntries);

    const personalSnapshot = await databaseModule.get(
      databaseModule.ref(db, `leaderboard/${user.uid}`)
    );
    const personal = personalSnapshot.exists()
      ? normalizeEntry(user.uid, personalSnapshot.val())
      : unrankedEntry(user.uid, profile);
    const personalRank = entries.findIndex((entry) => entry.uid === user.uid);

    return {
      entries,
      personal,
      personalRank: personalRank >= 0 ? personalRank + 1 : null
    };
  }

  async submitMatch(profile, result, { remember = true } = {}) {
    const match = sanitizeMatchResult(result);
    if (!match.roomCode || !match.playerId || !match.finishedAt) {
      throw new Error("The room did not provide a complete league placement.");
    }
    if (remember) rememberPendingMatch(match);

    const { db, databaseModule, user } = await initializeFirebase({ authenticate: true });
    this.userId = user.uid;

    const entryRef = databaseModule.ref(db, `leaderboard/${user.uid}`);
    let transaction;
    let lastError;
    for (let attempt = 0; attempt < SUBMIT_ATTEMPTS; attempt += 1) {
      try {
        transaction = await databaseModule.runTransaction(entryRef, (current) => {
          return buildLeaderboardEntry(current, profile, match, user.uid);
        }, { applyLocally: false });
        break;
      } catch (error) {
        lastError = error;
        if (attempt < SUBMIT_ATTEMPTS - 1) await wait(250 * (attempt + 1));
      }
    }
    if (!transaction) throw lastError ?? new Error("The league result could not be recorded.");

    if (!transaction.committed) {
      forgetPendingMatch(match);
      return {
        duplicate: true,
        award: 0,
        entry: normalizeEntry(user.uid, transaction.snapshot.val())
      };
    }

    forgetPendingMatch(match);
    return {
      duplicate: false,
      award: Number(transaction.snapshot.val()?.lastAward || 0),
      entry: normalizeEntry(user.uid, transaction.snapshot.val())
    };
  }

  async retryPending(profile) {
    const pending = readPendingMatches();
    for (const match of pending) {
      try {
        await this.submitMatch(profile, match, { remember: false });
      } catch {
        // Keep the result queued until Firebase and the finished room are available.
      }
    }
  }
}

export function leaguePointsForPlacement(place, totalPlayers) {
  const total = clampInteger(totalPlayers, 2, 6);
  const finish = clampInteger(place, 1, total);
  if (finish === 1) return 100 + Math.max(0, total - 2) * 20;
  if (finish === 2) return total === 2 ? 15 : 55 + Math.max(0, total - 3) * 10;
  if (finish === 3) return total === 3 ? 25 : 30 + Math.max(0, total - 4) * 5;
  return 10;
}

export function leagueTier(points) {
  const score = Math.max(0, Number(points || 0));
  const tiers = [
    { minimum: 10000, name: "Rift Legend", mark: "VI" },
    { minimum: 6000, name: "Crystal Champion", mark: "V" },
    { minimum: 3000, name: "Gold Arcanist", mark: "IV" },
    { minimum: 1500, name: "Silver Ward", mark: "III" },
    { minimum: 500, name: "Iron Sigil", mark: "II" },
    { minimum: 0, name: "Rune Initiate", mark: "I" }
  ];
  return tiers.find((tier) => score >= tier.minimum) ?? tiers[tiers.length - 1];
}

export function normalizeEntry(uid, value = {}) {
  const entry = value && typeof value === "object" ? value : {};
  const leaguePoints = nonNegativeInteger(entry.leaguePoints);
  return {
    uid: String(uid || entry.uid || ""),
    name: cleanName(entry.name),
    avatarId: String(entry.avatarId || "violet-hood").slice(0, 32),
    mageRank: String(entry.mageRank || "Rune Initiate").slice(0, 24),
    leagueTier: String(entry.leagueTier || leagueTier(leaguePoints).name).slice(0, 24),
    leaguePoints,
    onlineWins: nonNegativeInteger(entry.onlineWins),
    podiums: nonNegativeInteger(entry.podiums),
    onlineMatches: nonNegativeInteger(entry.onlineMatches),
    winStreak: nonNegativeInteger(entry.winStreak),
    bestStreak: nonNegativeInteger(entry.bestStreak),
    lastPlace: nonNegativeInteger(entry.lastPlace),
    lastPlayerCount: nonNegativeInteger(entry.lastPlayerCount),
    lastMatchAt: nonNegativeInteger(entry.lastMatchAt)
  };
}

export function compareEntries(a, b) {
  return (
    b.leaguePoints - a.leaguePoints ||
    b.onlineWins - a.onlineWins ||
    b.podiums - a.podiums ||
    Number(a.lastMatchAt || 0) - Number(b.lastMatchAt || 0) ||
    a.name.localeCompare(b.name)
  );
}

export function buildLeaderboardEntry(current, profile, result, uid, updatedAt = Date.now()) {
  const match = sanitizeMatchResult(result);
  if (!match.roomCode || !match.playerId || !match.finishedAt) {
    throw new Error("The room did not provide a complete league placement.");
  }
  if (current && Number(current.lastMatchAt || 0) >= match.finishedAt) return undefined;

  const previous = normalizeEntry(uid, current);
  const award = leaguePointsForPlacement(match.place, match.totalPlayers);
  const onlineWins = previous.onlineWins + (match.place === 1 ? 1 : 0);
  const podiums = previous.podiums + (match.place <= 3 ? 1 : 0);
  const winStreak = match.place === 1 ? previous.winStreak + 1 : 0;
  const bestStreak = Math.max(previous.bestStreak, winStreak);
  const leaguePoints = previous.leaguePoints + award;

  return {
    uid,
    playerId: match.playerId,
    name: cleanName(profile?.name),
    avatarId: String(profile?.avatarId || "violet-hood").slice(0, 32),
    mageRank: mageRank(profile),
    leagueTier: leagueTier(leaguePoints).name,
    leaguePoints,
    onlineWins,
    podiums,
    onlineMatches: previous.onlineMatches + 1,
    winStreak,
    bestStreak,
    lastPlace: match.place,
    lastPlayerCount: match.totalPlayers,
    lastAward: award,
    lastRoomCode: match.roomCode,
    lastMatchAt: match.finishedAt,
    updatedAt
  };
}

function unrankedEntry(uid, profile) {
  return normalizeEntry(uid, {
    name: profile?.name,
    avatarId: profile?.avatarId,
    mageRank: mageRank(profile)
  });
}

function sanitizeMatchResult(result = {}) {
  const totalPlayers = clampInteger(result.totalPlayers, 2, 6);
  return {
    roomCode: String(result.roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
    playerId: String(result.playerId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32),
    place: clampInteger(result.place, 1, totalPlayers),
    totalPlayers,
    finishedAt: nonNegativeInteger(result.finishedAt)
  };
}

function cleanName(value) {
  return String(value || "Player").trim().slice(0, 16) || "Player";
}

function clampInteger(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Math.round(Number(value) || minimum)));
}

function nonNegativeInteger(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function pendingMatchKey(match) {
  return `${match.roomCode}:${match.playerId}:${match.finishedAt}`;
}

function readPendingMatches() {
  if (!globalThis.localStorage) return [];
  try {
    const stored = JSON.parse(globalThis.localStorage.getItem(PENDING_RESULTS_KEY));
    return Array.isArray(stored) ? stored.map(sanitizeMatchResult).filter((match) => (
      match.roomCode && match.playerId && match.finishedAt
    )) : [];
  } catch {
    return [];
  }
}

function rememberPendingMatch(match) {
  if (!globalThis.localStorage) return;
  const pending = readPendingMatches();
  const key = pendingMatchKey(match);
  const next = [
    ...pending.filter((entry) => pendingMatchKey(entry) !== key),
    match
  ].slice(-10);
  globalThis.localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(next));
}

function forgetPendingMatch(match) {
  if (!globalThis.localStorage) return;
  const key = pendingMatchKey(match);
  const pending = readPendingMatches().filter((entry) => pendingMatchKey(entry) !== key);
  if (pending.length) {
    globalThis.localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(pending));
  } else {
    globalThis.localStorage.removeItem(PENDING_RESULTS_KEY);
  }
}
