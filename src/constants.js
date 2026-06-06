export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 14;
export const STARTING_HP = 100;
export const OVERFLOW_DAMAGE = 25;
export const DROP_SPEED = 720;
export const SOFT_DROP_SPEED = 55;
export const LOCK_DELAY = 250;
export const AI_SPEEDS = {
  easy: 1500,
  normal: 1050,
  hard: 700
};

export const RUNES = ["fire", "water", "earth", "air", "lightning", "shadow"];

export const RUNE_DATA = {
  fire: { label: "Fire", spell: "FIREBALL!", icon: "./assets/runes/fire.svg" },
  water: { label: "Water", spell: "CLEANSE!", icon: "./assets/runes/water.svg" },
  earth: { label: "Earth", spell: "STONE SHIELD!", icon: "./assets/runes/earth.svg" },
  air: { label: "Air", spell: "GUST!", icon: "./assets/runes/air.svg" },
  lightning: { label: "Lightning", spell: "CHAIN BOLT!", icon: "./assets/runes/lightning.svg" },
  shadow: { label: "Shadow", spell: "CURSE!", icon: "./assets/runes/shadow.svg" },
  junk: { label: "Junk", spell: "", icon: "./assets/runes/junk.svg" }
};

export const SPELL_VALUES = {
  fireDamage: 12,
  waterCleanse: 4,
  earthShield: 8,
  airClear: 1,
  utilityDamage: 4,
  lightningDamage: 7,
  lightningJunk: 2,
  shadowDamage: 5,
  shadowJunk: 3
};

export function comboMultiplier(combo) {
  if (combo >= 3) return 2.7;
  if (combo === 2) return 1.8;
  return 1;
}

export function matchSizeMultiplier(size = 3) {
  return 1 + Math.max(0, size - 3) * 0.35;
}
