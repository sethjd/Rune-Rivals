import {
  comboMultiplier,
  matchSizeMultiplier,
  RUNE_DATA,
  SPELL_VALUES,
  SURGE_VALUES
} from "./constants.js";

export const POWER_EXAMPLES = [
  { label: "Match 3", detail: "Standard cast", matchSize: 3, combo: 1 },
  { label: "Match 4", detail: "35% stronger", matchSize: 4, combo: 1 },
  { label: "Match 5", detail: "70% stronger", matchSize: 5, combo: 1 },
  { label: "2x Chain", detail: "Second cascade", matchSize: 3, combo: 2 },
  { label: "3x Chain", detail: "Third cascade or higher", matchSize: 3, combo: 3 }
];

export const SPELL_CODEX = [
  spell({
    id: "fire",
    name: "Fireball",
    school: "Fire",
    summary: "The pure damage spell. It has no defensive effect, but ends duels quickly.",
    timing: "Immediate",
    trigger: "Connect 3 or more Fire runes.",
    baseSelf: "No effect on your board.",
    baseRival: `${SPELL_VALUES.fireDamage} damage.`,
    tip: "Build larger Fire groups when the rival's shield is down.",
    describe: (power) => ({
      self: "No self effect",
      rival: `${scaled(SPELL_VALUES.fireDamage, power)} damage`
    })
  }),
  spell({
    id: "water",
    name: "Cleanse",
    school: "Water",
    summary: "Repairs a cluttered board while still dealing a small amount of damage.",
    timing: "Immediate",
    trigger: "Connect 3 or more Water runes.",
    baseSelf: `Removes up to ${SPELL_VALUES.waterCleanse} junk stones.`,
    baseRival: `${SPELL_VALUES.utilityDamage} damage.`,
    tip: "Save Water groups until junk is actually blocking useful spaces.",
    describe: (power) => ({
      self: `Cleanse up to ${Math.ceil(SPELL_VALUES.waterCleanse * power)} junk`,
      rival: `${scaled(SPELL_VALUES.utilityDamage, power)} damage`
    })
  }),
  spell({
    id: "earth",
    name: "Stone Ward",
    school: "Earth",
    summary: "Adds a shield that absorbs incoming damage before your health is touched.",
    timing: "Immediate",
    trigger: "Connect 3 or more Earth runes.",
    baseSelf: `Gain ${SPELL_VALUES.earthShield} shield.`,
    baseRival: `${SPELL_VALUES.utilityDamage} damage.`,
    tip: "Earth is strongest before a large enemy hit, not after it.",
    describe: (power) => ({
      self: `Gain ${scaled(SPELL_VALUES.earthShield, power)} shield`,
      rival: `${scaled(SPELL_VALUES.utilityDamage, power)} damage`
    })
  }),
  spell({
    id: "air",
    name: "Gust",
    school: "Air",
    summary: "Removes your highest placed rune, lowering the board and reducing breach risk.",
    timing: "Immediate",
    trigger: "Connect 3 or more Air runes.",
    baseSelf: `Removes ${SPELL_VALUES.airClear} highest tile.`,
    baseRival: `${SPELL_VALUES.utilityDamage} damage.`,
    tip: "Use Air when one awkward tower is reaching the danger zone.",
    describe: (power) => ({
      self: `Remove ${Math.max(1, Math.ceil(SPELL_VALUES.airClear * power))} highest tile${Math.ceil(SPELL_VALUES.airClear * power) === 1 ? "" : "s"}`,
      rival: `${scaled(SPELL_VALUES.utilityDamage, power)} damage`
    })
  }),
  spell({
    id: "lightning",
    name: "Chain Bolt",
    school: "Lightning",
    summary: "Hits the rival and drops junk onto their board immediately.",
    timing: "Immediate junk",
    trigger: "Connect 3 or more Lightning runes.",
    baseSelf: "No effect on your board.",
    baseRival: `${SPELL_VALUES.lightningDamage} damage and ${SPELL_VALUES.lightningJunk} junk stones now.`,
    tip: "Lightning is excellent when the rival's board is already near the top.",
    describe: (power) => ({
      self: "No self effect",
      rival: `${scaled(SPELL_VALUES.lightningDamage, power)} damage + ${Math.max(1, scaled(SPELL_VALUES.lightningJunk, power))} junk now`
    })
  }),
  spell({
    id: "shadow",
    name: "Curse",
    school: "Shadow",
    summary: "Deals damage and queues junk that appears after the rival locks their next piece.",
    timing: "Delayed junk",
    trigger: "Connect 3 or more Shadow runes.",
    baseSelf: "No effect on your board.",
    baseRival: `${SPELL_VALUES.shadowDamage} damage and ${SPELL_VALUES.shadowJunk} queued junk stones.`,
    tip: "A Curse forces the rival to plan their next drop around incoming clutter.",
    describe: (power) => ({
      self: "No self effect",
      rival: `${scaled(SPELL_VALUES.shadowDamage, power)} damage + ${scaled(SPELL_VALUES.shadowJunk, power)} delayed junk`
    })
  }),
  {
    id: "arcane",
    name: "Arcane Surge",
    school: "Arcane",
    icon: "./assets/spells/arcane-surge.svg",
    summary: "A fixed-power ultimate charged by casting ordinary spells.",
    timing: "Manual cast",
    trigger: `Fill the Focus meter to ${SURGE_VALUES.chargeRequired}%, then press Surge or S.`,
    baseSelf: `Gain ${SURGE_VALUES.shield} shield and remove up to ${SURGE_VALUES.cleanse} junk stones.`,
    baseRival: `${SURGE_VALUES.damage} damage and ${SURGE_VALUES.junk} immediate junk stones.`,
    tip: "Surge does not scale with matches or chains, so use it as soon as the timing is valuable.",
    fixed: true,
    describe: () => ({
      self: `+${SURGE_VALUES.shield} shield, cleanse ${SURGE_VALUES.cleanse}`,
      rival: `${SURGE_VALUES.damage} damage + ${SURGE_VALUES.junk} junk`
    })
  }
];

export const CODEX_GLOSSARY = [
  {
    term: "Shield",
    definition: "Absorbs damage before health. Any unused shield remains for later attacks."
  },
  {
    term: "Junk",
    definition: "Black stones that cannot match. Cleanse removes them; overflow can also clear the top rows."
  },
  {
    term: "Delayed Junk",
    definition: "Queued by Shadow and added only after the affected player locks their next piece."
  },
  {
    term: "Chain",
    definition: "A new match created by falling runes after another match clears. Chains multiply spell power."
  },
  {
    term: "Board Breach",
    definition: "Locking above the board deals 25 damage, then clears the top three rows to keep the duel moving."
  },
  {
    term: "Focus",
    definition: "Energy gained by your spell casts. Larger matches and longer chains fill it faster."
  }
];

export function getCodexSpell(id) {
  return SPELL_CODEX.find((entry) => entry.id === id) ?? SPELL_CODEX[0];
}

export function powerForExample(example) {
  if (!example) return 1;
  return comboMultiplier(example.combo) * matchSizeMultiplier(example.matchSize);
}

function spell(data) {
  return {
    ...data,
    icon: RUNE_DATA[data.id].icon
  };
}

function scaled(value, power) {
  return Math.round(value * power);
}
