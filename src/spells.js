import { comboMultiplier, matchSizeMultiplier, RUNE_DATA, SPELL_VALUES, SURGE_VALUES } from "./constants.js";

export function createFighter(name) {
  return {
    name,
    hp: 100,
    maxHp: 100,
    shield: 0,
    junkQueue: 0,
    focus: 0,
    maxFocus: SURGE_VALUES.chargeRequired
  };
}

export function applyDamage(fighter, amount) {
  const blocked = Math.min(fighter.shield, amount);
  fighter.shield -= blocked;
  fighter.hp = Math.max(0, fighter.hp - (amount - blocked));
  return amount - blocked;
}

export function castSpell(type, combo, caster, target, casterBoard, targetBoard, matchSize = 3, powerScale = 1) {
  const multiplier = comboMultiplier(combo) * matchSizeMultiplier(matchSize) * powerScale;
  const result = {
    type,
    combo,
    matchSize,
    power: multiplier,
    label: RUNE_DATA[type]?.spell ?? "RUNE SURGE!",
    attack: null
  };

  switch (type) {
    case "fire":
      result.attack = { kind: "damage", type, amount: Math.round(SPELL_VALUES.fireDamage * multiplier) };
      applyDamage(target, result.attack.amount);
      break;
    case "water":
      result.amount = casterBoard.removeJunk(Math.ceil(SPELL_VALUES.waterCleanse * multiplier));
      result.attack = { kind: "damage", type, amount: Math.round(SPELL_VALUES.utilityDamage * multiplier) };
      applyDamage(target, result.attack.amount);
      break;
    case "earth":
      result.amount = Math.round(SPELL_VALUES.earthShield * multiplier);
      caster.shield += result.amount;
      result.attack = { kind: "damage", type, amount: Math.round(SPELL_VALUES.utilityDamage * multiplier) };
      applyDamage(target, result.attack.amount);
      break;
    case "air":
      result.amount = Math.max(1, Math.ceil(SPELL_VALUES.airClear * multiplier));
      for (let i = 0; i < result.amount; i += 1) casterBoard.removeHighestTile();
      result.attack = { kind: "damage", type, amount: Math.round(SPELL_VALUES.utilityDamage * multiplier) };
      applyDamage(target, result.attack.amount);
      break;
    case "lightning":
      result.attack = {
        kind: "lightning",
        type,
        damage: Math.round(SPELL_VALUES.lightningDamage * multiplier),
        junk: Math.max(1, Math.round(SPELL_VALUES.lightningJunk * multiplier))
      };
      applyDamage(target, result.attack.damage);
      result.overflowed = targetBoard.addJunk(result.attack.junk);
      break;
    case "shadow":
      result.attack = {
        kind: "curse",
        type,
        damage: Math.round(SPELL_VALUES.shadowDamage * multiplier),
        junk: Math.round(SPELL_VALUES.shadowJunk * multiplier)
      };
      applyDamage(target, result.attack.damage);
      target.junkQueue += result.attack.junk;
      break;
    default:
      break;
  }

  return result;
}

export function applyIncomingAttack(attack, fighter, board) {
  if (!attack) return false;
  let overflowed = false;
  if (attack.kind === "damage") applyDamage(fighter, attack.amount);
  if (attack.kind === "lightning") {
    applyDamage(fighter, attack.damage);
    overflowed = board.addJunk(attack.junk);
  }
  if (attack.kind === "curse") {
    applyDamage(fighter, attack.damage ?? 0);
    fighter.junkQueue += attack.junk;
  }
  if (attack.kind === "surge") {
    applyDamage(fighter, attack.damage ?? SURGE_VALUES.damage);
    overflowed = board.addJunk(attack.junk ?? SURGE_VALUES.junk);
  }
  return overflowed;
}
