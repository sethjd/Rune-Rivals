import {
  normalizeEquippedRelics,
  relicForLevel,
  unlockedRelicIds
} from "./relics.js";

const PROFILE_KEY = "rune-rivals-profile-v1";
const XP_PER_LEVEL = 180;

const MAGE_RANKS = [
  { level: 1, name: "Rune Initiate" },
  { level: 3, name: "Sigil Adept" },
  { level: 6, name: "Arcane Duelist" },
  { level: 10, name: "Spellbinder" },
  { level: 15, name: "Rift Warden" },
  { level: 22, name: "Grand Magus" }
];

export const AVATARS = [
  { id: "violet-hood", name: "Violet Hood", skin: "#c98773", hair: "#251335", robe: "#54328b", gem: "#55e2ff", style: "hood" },
  { id: "ember-crown", name: "Ember Crown", skin: "#b96f59", hair: "#8b351b", robe: "#263f69", gem: "#ffb13d", style: "spikes" },
  { id: "moon-sage", name: "Moon Sage", skin: "#815649", hair: "#d8d5e8", robe: "#35315f", gem: "#cf7bff", style: "long" },
  { id: "forest-warden", name: "Forest Warden", skin: "#d19a76", hair: "#3d2b1e", robe: "#3e6e3b", gem: "#b8e66b", style: "braid" },
  { id: "frost-weaver", name: "Frost Weaver", skin: "#e3b49d", hair: "#bdeeff", robe: "#2e6084", gem: "#d9fbff", style: "swept" },
  { id: "sun-priest", name: "Sun Priest", skin: "#9d6049", hair: "#281814", robe: "#85552d", gem: "#ffe26b", style: "cowl" },
  { id: "storm-runner", name: "Storm Runner", skin: "#c37c64", hair: "#273249", robe: "#325783", gem: "#7bdcff", style: "spikes" },
  { id: "shadow-oracle", name: "Shadow Oracle", skin: "#754d55", hair: "#19131f", robe: "#522963", gem: "#e07bff", style: "hood" },
  { id: "ruby-duelist", name: "Ruby Duelist", skin: "#e0a181", hair: "#56252c", robe: "#7b2936", gem: "#ff6e63", style: "swept" },
  { id: "tide-caller", name: "Tide Caller", skin: "#a76854", hair: "#173855", robe: "#176888", gem: "#62e7ff", style: "long" },
  { id: "stone-binder", name: "Stone Binder", skin: "#8d5e47", hair: "#4a4238", robe: "#61613d", gem: "#d7be70", style: "cowl" },
  { id: "star-apprentice", name: "Star Apprentice", skin: "#d58f79", hair: "#432b64", robe: "#434482", gem: "#fff39a", style: "braid" },
  { id: "ash-magus", name: "Ash Magus", skin: "#a56c59", hair: "#aaa6ad", robe: "#4b434c", gem: "#ff8e55", style: "swept" },
  { id: "jade-seer", name: "Jade Seer", skin: "#d5a07b", hair: "#183a30", robe: "#28644b", gem: "#77f0a2", style: "long" },
  { id: "arcane-nomad", name: "Arcane Nomad", skin: "#70483d", hair: "#d4a45c", robe: "#59417b", gem: "#8ce6ff", style: "cowl" }
];

export function loadProfile() {
  const fallback = {
    name: "Lyra",
    avatarId: AVATARS[0].id,
    unlockedLevel: 1,
    completedLevels: [],
    storyStars: {},
    unlockedRelics: [],
    equippedRelics: [],
    controlLayout: "classic",
    xp: 0,
    wins: 0,
    onlineWins: 0,
    battles: 0,
    bestCombo: 0,
    totalDamage: 0,
    medals: 0
  };

  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY));
    const migrated = {
      ...fallback,
      ...stored,
      completedLevels: Array.isArray(stored?.completedLevels) ? stored.completedLevels : [],
      storyStars: stored?.storyStars && typeof stored.storyStars === "object" ? stored.storyStars : {},
      controlLayout: normalizeControlLayout(stored?.controlLayout)
    };
    migrated.unlockedRelics = unlockedRelicIds(migrated.completedLevels, stored?.unlockedRelics);
    migrated.equippedRelics = normalizeEquippedRelics(migrated);
    if (!migrated.equippedRelics.length && migrated.unlockedRelics.length) {
      migrated.equippedRelics = [migrated.unlockedRelics[0]];
    }
    return migrated;
  } catch {
    return fallback;
  }
}

export function saveProfile(profile) {
  const prepared = {
    ...profile,
    name: String(profile.name || "Player").trim().slice(0, 16) || "Player",
    controlLayout: normalizeControlLayout(profile.controlLayout)
  };
  prepared.unlockedRelics = unlockedRelicIds(prepared.completedLevels, prepared.unlockedRelics);
  prepared.equippedRelics = normalizeEquippedRelics(prepared);
  const clean = prepared;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
  return clean;
}

export function completeStoryLevel(profile, levelNumber, stars = 1) {
  const completed = new Set(profile.completedLevels);
  completed.add(levelNumber);
  const storyStars = {
    ...(profile.storyStars ?? {}),
    [levelNumber]: Math.max(profile.storyStars?.[levelNumber] ?? 0, stars)
  };
  const relic = relicForLevel(levelNumber);
  const unlockedRelics = unlockedRelicIds(
    [...completed],
    [...(profile.unlockedRelics ?? []), ...(relic ? [relic.id] : [])]
  );
  const equippedRelics = profile.equippedRelics?.length
    ? profile.equippedRelics
    : unlockedRelics.slice(0, 1);
  return saveProfile({
    ...profile,
    completedLevels: [...completed].sort((a, b) => a - b),
    storyStars,
    unlockedRelics,
    equippedRelics,
    unlockedLevel: Math.max(profile.unlockedLevel, Math.min(20, levelNumber + 1))
  });
}

export function recordBattle(profile, {
  won = false,
  mode = "ai",
  summary = {}
} = {}) {
  const xpEarned = Math.max(
    10,
    (won ? 70 : 20) +
      Math.min(50, Number(summary.damageDealt ?? 0)) +
      Math.max(0, Number(summary.largestCombo ?? 1) - 1) * 15
  );
  return saveProfile({
    ...profile,
    xp: Math.max(0, Number(profile.xp ?? 0)) + xpEarned,
    battles: Math.max(0, Number(profile.battles ?? 0)) + 1,
    wins: Math.max(0, Number(profile.wins ?? 0)) + (won ? 1 : 0),
    onlineWins: Math.max(0, Number(profile.onlineWins ?? 0)) + (won && mode === "online" ? 1 : 0),
    bestCombo: Math.max(Number(profile.bestCombo ?? 0), Number(summary.largestCombo ?? 0)),
    totalDamage: Math.max(0, Number(profile.totalDamage ?? 0)) + Math.max(0, Number(summary.damageDealt ?? 0)),
    medals: Math.max(0, Number(profile.medals ?? 0)) + Math.max(0, Number(summary.medalCount ?? 0))
  });
}

export function mageLevel(profile) {
  return Math.max(1, Math.floor(Math.max(0, Number(profile?.xp ?? 0)) / XP_PER_LEVEL) + 1);
}

export function mageRank(profile) {
  const level = mageLevel(profile);
  return [...MAGE_RANKS].reverse().find((rank) => level >= rank.level)?.name ?? MAGE_RANKS[0].name;
}

export function masteryProgress(profile) {
  const xp = Math.max(0, Number(profile?.xp ?? 0));
  return {
    level: mageLevel(profile),
    current: xp % XP_PER_LEVEL,
    required: XP_PER_LEVEL,
    percent: xp % XP_PER_LEVEL / XP_PER_LEVEL * 100
  };
}

export function totalStoryStars(profile) {
  return Object.values(profile?.storyStars ?? {}).reduce((total, stars) => total + Number(stars || 0), 0);
}

export function getAvatar(id) {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}

export function avatarDataUri(id) {
  const avatar = getAvatar(id);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(avatarSvg(avatar))}`;
}

export function normalizeControlLayout(value) {
  return ["classic", "swipe", "left", "large"].includes(value) ? value : "classic";
}

function avatarSvg(avatar) {
  const hair = hairPath(avatar.style);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
    <defs>
      <radialGradient id="bg"><stop stop-color="${avatar.robe}"/><stop offset="1" stop-color="#0d0b1d"/></radialGradient>
      <linearGradient id="robe" x2="0" y2="1"><stop stop-color="${avatar.robe}"/><stop offset="1" stop-color="#171225"/></linearGradient>
    </defs>
    <circle cx="90" cy="90" r="88" fill="url(#bg)"/>
    <path d="M12 174c8-48 36-70 78-70s70 22 78 70Z" fill="url(#robe)" stroke="#c78b3c" stroke-width="4"/>
    <path d="M52 62c3-29 21-45 40-45 24 0 42 19 39 51l-5 43c-6 25-57 26-69 2Z" fill="${avatar.skin}"/>
    ${hair}
    <path d="M63 80c8-6 17-6 24 0M104 80c8-6 16-5 23 1" fill="none" stroke="#332128" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="76" cy="86" rx="4" ry="6" fill="${avatar.gem}"/>
    <ellipse cx="116" cy="86" rx="4" ry="6" fill="${avatar.gem}"/>
    <path d="M84 107c9 5 18 4 26-2" fill="none" stroke="#713d4b" stroke-width="4" stroke-linecap="round"/>
    <path d="M67 128 91 148l24-20 10 46H57Z" fill="#171326" stroke="#d2a24d" stroke-width="4"/>
    <path d="m91 133 8 11-8 18-8-18Z" fill="${avatar.gem}" stroke="#fff0ba" stroke-width="3"/>
  </svg>`;
}

function hairPath(style) {
  const styles = {
    hood: '<path d="M28 117C18 63 43 13 89 8c48-5 80 40 65 102-13-25-34-45-63-50-29 6-49 28-63 57Z" fill="#211331" stroke="#7251a6" stroke-width="7"/><path d="M48 68c14-5 29-16 42-36 11 16 27 25 44 27-5-29-20-46-43-47-24-1-40 18-43 56Z" fill="#24152f"/>',
    spikes: '<path d="M44 67 54 34l15 8 14-29 12 21 24-27-1 28 27-13-13 35 15 9-18 17-10-31c-19 10-42 12-70 3Z" fill="#5b2b22" stroke="#a34e2b" stroke-width="5"/>',
    long: '<path d="M43 65c0-35 20-54 48-54 30 0 48 23 44 59l8 57-23 30-4-98c-21 10-42 10-65 0l4 98-22-29Z" fill="#d4d0dc" stroke="#817b8e" stroke-width="5"/>',
    braid: '<path d="M46 66c1-35 19-52 45-52 28 0 44 21 41 55-19-4-33-13-42-28-9 14-24 23-44 25Z" fill="#3c291d"/><path d="M48 59c-8 35-8 67 2 95l14-8-9-91ZM130 59c8 35 8 67-2 95l-14-8 9-91Z" fill="#3c291d"/>',
    swept: '<path d="M44 68c0-38 19-57 49-57 28 0 45 20 42 55-17-2-34-13-47-33-9 18-24 29-44 35Z" fill="#27374d" stroke="#4d6885" stroke-width="5"/>',
    cowl: '<path d="M31 116C20 67 42 19 89 12c45-6 75 36 66 97-15-28-35-45-64-50-29 6-49 24-60 57Z" fill="#2e2b32" stroke="#777078" stroke-width="6"/><path d="M51 65c11-3 25-14 39-32 10 15 25 24 43 27-5-29-20-45-43-45-22 0-37 17-39 50Z" fill="#211a1a"/>'
  };
  return styles[style] ?? styles.hood;
}
