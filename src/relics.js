export const RELICS = [
  {
    id: "roadwardens-mark",
    name: "Roadwarden's Mark",
    description: "Start each Story duel with 10% Arcane Surge.",
    unlockLevel: 1,
    icon: "./assets/runes/air.svg"
  },
  {
    id: "ashglass-charm",
    name: "Ashglass Charm",
    description: "Fire matches deal +2 damage.",
    unlockLevel: 2,
    icon: "./assets/runes/fire.svg"
  },
  {
    id: "storm-thread",
    name: "Storm Thread",
    description: "Your first Lightning spell each duel sends +1 junk.",
    unlockLevel: 7,
    icon: "./assets/runes/lightning.svg"
  },
  {
    id: "rootguard-token",
    name: "Rootguard Token",
    description: "Earth shields are 25% stronger.",
    unlockLevel: 15,
    icon: "./assets/runes/earth.svg"
  },
  {
    id: "mirror-rune",
    name: "Mirror Rune",
    description: "Once per duel, block the first incoming junk attack.",
    unlockLevel: 19,
    icon: "./assets/runes/shadow.svg"
  }
];

const RELIC_IDS = new Set(RELICS.map((relic) => relic.id));

export function getRelic(id) {
  return RELICS.find((relic) => relic.id === id) ?? null;
}

export function relicForLevel(levelNumber) {
  return RELICS.find((relic) => relic.unlockLevel === Number(levelNumber)) ?? null;
}

export function unlockedRelicIds(completedLevels = [], storedRelics = []) {
  const completed = new Set((completedLevels ?? []).map(Number));
  return [...new Set([
    ...(storedRelics ?? []).filter((id) => RELIC_IDS.has(id)),
    ...RELICS.filter((relic) => completed.has(relic.unlockLevel)).map((relic) => relic.id)
  ])];
}

export function relicSlotCount(profile) {
  return (profile?.completedLevels ?? []).includes(10) ? 2 : 1;
}

export function normalizeEquippedRelics(profile) {
  const unlocked = new Set(unlockedRelicIds(profile?.completedLevels, profile?.unlockedRelics));
  return [...new Set(profile?.equippedRelics ?? [])]
    .filter((id) => unlocked.has(id))
    .slice(0, relicSlotCount(profile));
}

export function toggleEquippedRelic(profile, relicId) {
  const unlocked = unlockedRelicIds(profile?.completedLevels, profile?.unlockedRelics);
  if (!unlocked.includes(relicId)) return profile;

  const equipped = normalizeEquippedRelics({ ...profile, unlockedRelics: unlocked });
  const next = equipped.includes(relicId)
    ? equipped.filter((id) => id !== relicId)
    : [...equipped, relicId].slice(-relicSlotCount(profile));

  return {
    ...profile,
    unlockedRelics: unlocked,
    equippedRelics: next
  };
}

export function hasRelic(relicIds, relicId) {
  return Array.isArray(relicIds) && relicIds.includes(relicId);
}
