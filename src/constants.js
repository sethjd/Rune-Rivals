export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 14;
export const STARTING_HP = 100;
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
  fireDamage: 6,
  waterCleanse: 2,
  earthShield: 6,
  lightningDamage: 3,
  lightningJunk: 1,
  shadowJunk: 2
};

export function comboMultiplier(combo) {
  if (combo >= 3) return 2;
  if (combo === 2) return 1.5;
  return 1;
}
