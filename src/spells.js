import { comboMultiplier, RUNE_DATA, SPELL_VALUES } from "./constants.js";

export function createFighter(name) {
  return {
    name,
    hp: 100,
    shield: 0,
    junkQueue: 0
  };
}

export function applyDamage(fighter, amount) {
  const blocked = Math.min(fighter.shield, amount);
  fighter.shield -= blocked;
  fighter.hp = Math.max(0, fighter.hp - (amount - blocked));
  return amount - blocked;
}

export function castSpell(type, combo, caster, target, casterBoard, targetBoard) {
  const multiplier = comboMultiplier(combo);
  const result = {
    type,
    combo,
    label: RUNE_DATA[type]?.spell ?? "RUNE SURGE!",
    attack: null
  };

  switch (type) {
    case "fire":
      result.attack = { kind: "damage", amount: Math.round(SPELL_VALUES.fireDamage * multiplier) };
      applyDamage(target, result.attack.amount);
      break;
    case "water":
      result.amount = casterBoard.removeJunk(Math.ceil(SPELL_VALUES.waterCleanse * multiplier));
      break;
    case "earth":
      result.amount = Math.round(SPELL_VALUES.earthShield * multiplier);
      caster.shield += result.amount;
      break;
    case "air":
      result.amount = Math.max(1, Math.floor(multiplier));
      for (let i = 0; i < result.amount; i += 1) casterBoard.removeHighestTile();
      break;
    case "lightning":
      result.attack = {
        kind: "lightning",
        damage: Math.round(SPELL_VALUES.lightningDamage * multiplier),
        junk: Math.max(1, Math.round(SPELL_VALUES.lightningJunk * multiplier))
      };
      applyDamage(target, result.attack.damage);
      result.overflowed = targetBoard.addJunk(result.attack.junk);
      break;
    case "shadow":
      result.attack = {
        kind: "curse",
        junk: Math.round(SPELL_VALUES.shadowJunk * multiplier)
      };
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
  if (attack.kind === "curse") fighter.junkQueue += attack.junk;
  return overflowed;
}
