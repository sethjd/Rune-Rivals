export const STORY_LEVELS = [
  level(1, "Mossbound Gate", "Elda the Gatekeeper", "forest-warden", "The first sigil shard waits beyond an overgrown ward.", "Elda begins with a cluttered board.", { enemyHp: 65, enemyJunk: 5, aiSpeed: 5200, aiAccuracy: 0.35 }),
  level(2, "Ember Steps", "Brann of Cinders", "ember-crown", "A hot-tempered rival guards the volcanic stair.", "Your Fire runes are empowered.", { enemyHp: 72, aiSpeed: 5000, aiAccuracy: 0.4, playerRuneBoost: { fire: 1.35 } }),
  level(3, "Tidal Archive", "Mira Tidecaller", "tide-caller", "Flooded shelves conceal the second shard.", "Mira starts behind a water ward.", { enemyHp: 76, enemyShield: 12, aiSpeed: 4800, aiAccuracy: 0.45, enemyRuneBoost: { water: 1.25 } }),
  level(4, "Windglass Bridge", "Nim the Swift", "frost-weaver", "The bridge shifts beneath every falling rune.", "Nim places runes a little faster.", { enemyHp: 78, aiSpeed: 4500, aiAccuracy: 0.48 }),
  level(5, "Stonewake Hall", "Torren Stonebinder", "stone-binder", "An ancient hall answers to earth magic.", "Both rivals begin shielded.", { enemyHp: 82, enemyShield: 14, playerShield: 8, aiSpeed: 4500, aiAccuracy: 0.5, enemyRuneBoost: { earth: 1.2 } }),
  level(6, "Moonlit Fen", "Sable Oracle", "shadow-oracle", "Cursed lights drift above the black water.", "Three junk stones begin on your board.", { enemyHp: 80, playerJunk: 3, aiSpeed: 4300, aiAccuracy: 0.52, enemyRuneBoost: { shadow: 1.2 } }),
  level(7, "Thunder Run", "Vey Stormrunner", "storm-runner", "Lightning cracks across a narrow mountain pass.", "Lightning magic is stronger for everyone.", { enemyHp: 86, aiSpeed: 4200, aiAccuracy: 0.55, playerRuneBoost: { lightning: 1.25 }, enemyRuneBoost: { lightning: 1.25 } }),
  level(8, "Jade Observatory", "Ilyra the Seer", "jade-seer", "The stars reveal a dangerous route forward.", "You begin with less health but extra shield.", { playerHp: 82, playerShield: 14, enemyHp: 80, aiSpeed: 4200, aiAccuracy: 0.56 }),
  level(9, "Ashen Library", "Orrin Ashcloak", "ash-magus", "Burned spellbooks whisper from the shelves.", "Orrin's Fire and Shadow magic are empowered.", { enemyHp: 88, aiSpeed: 4000, aiAccuracy: 0.58, enemyRuneBoost: { fire: 1.2, shadow: 1.2 } }),
  level(10, "The First Vault", "Kael the Challenger", "ember-crown", "Kael holds the first half of the shattered sigil.", "A balanced rival with a fortified opening.", { enemyHp: 95, enemyShield: 10, enemyJunk: 2, aiSpeed: 3800, aiAccuracy: 0.62 }),
  level(11, "Frostfall Court", "Ysra Frostweaver", "frost-weaver", "Frozen banners hang over the silent court.", "Water and Air runes strike harder for you.", { enemyHp: 90, playerRuneBoost: { water: 1.25, air: 1.25 }, aiSpeed: 3900, aiAccuracy: 0.62 }),
  level(12, "Cinder Market", "Rook the Ruby", "ruby-duelist", "A ruthless duelist blocks the crowded market.", "Both boards begin with loose junk.", { enemyHp: 94, playerJunk: 3, enemyJunk: 4, aiSpeed: 3700, aiAccuracy: 0.65 }),
  level(13, "Nomad's Crossing", "Amon Starwalker", "arcane-nomad", "A wandering mage tests every school of magic.", "All enemy spells gain a small power boost.", { enemyHp: 96, enemyPower: 1.12, aiSpeed: 3600, aiAccuracy: 0.68 }),
  level(14, "Sunken Belfry", "Mira Ascendant", "tide-caller", "The drowned bells ring for a rematch.", "Mira begins shielded and Water magic surges.", { enemyHp: 100, enemyShield: 16, enemyRuneBoost: { water: 1.35 }, aiSpeed: 3500, aiAccuracy: 0.7 }),
  level(15, "The Verdant Crown", "Elda Thornqueen", "forest-warden", "Roots have swallowed an entire rune temple.", "Earth magic is stronger and both boards are crowded.", { enemyHp: 102, playerJunk: 4, enemyJunk: 5, playerRuneBoost: { earth: 1.2 }, enemyRuneBoost: { earth: 1.3 }, aiSpeed: 3400, aiAccuracy: 0.72 }),
  level(16, "Stormspire", "Vey Thunderborn", "storm-runner", "The second sigil half waits at the storm's eye.", "Vey is fast and begins with a charged shield.", { enemyHp: 105, enemyShield: 18, aiSpeed: 3000, aiAccuracy: 0.75, enemyRuneBoost: { lightning: 1.3 } }),
  level(17, "The Hollow Moon", "Sable Nightseer", "shadow-oracle", "A false moon pours curses into the arena.", "You begin cursed with six junk stones.", { enemyHp: 100, playerJunk: 6, aiSpeed: 3100, aiAccuracy: 0.78, enemyRuneBoost: { shadow: 1.35 } }),
  level(18, "Celestial Steps", "Nova the Apprentice", "star-apprentice", "An unlikely young champion guards the final ascent.", "Your health is reduced, but every spell is stronger.", { playerHp: 78, playerPower: 1.22, enemyHp: 105, aiSpeed: 2900, aiAccuracy: 0.8 }),
  level(19, "The Broken Throne", "Kael Sigilbound", "ember-crown", "Kael returns wielding both halves of the sigil.", "Kael starts heavily shielded and empowered.", { enemyHp: 110, enemyShield: 22, enemyPower: 1.18, aiSpeed: 2600, aiAccuracy: 0.86 }),
  level(20, "Heart of the Rift", "The Rift Magus", "moon-sage", "Seal the rift before wild rune magic consumes the realm.", "Final duel: crowded boards, high shields, and empowered magic.", { playerJunk: 4, enemyJunk: 6, playerShield: 12, enemyShield: 25, enemyHp: 120, enemyPower: 1.22, aiSpeed: 2300, aiAccuracy: 0.92 })
];

function level(number, title, opponent, avatarId, description, quirk, rules) {
  return { number, title, opponent, avatarId, description, quirk, rules };
}

export function getStoryLevel(number) {
  return STORY_LEVELS.find((levelData) => levelData.number === Number(number)) ?? STORY_LEVELS[0];
}
