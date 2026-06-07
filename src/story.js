export const STORY_CHAPTERS = [
  {
    number: 1,
    title: "The Waking Roads",
    subtitle: "A broken ward calls the realm's rivals back to battle.",
    icon: "./assets/runes/earth.svg",
    lore: "The Shattered Sigil once kept the six rune schools in balance. Its first fracture has awakened every old road and every older grudge."
  },
  {
    number: 2,
    title: "The Drowned Moon",
    subtitle: "Follow the lost shard through halls claimed by black water.",
    icon: "./assets/runes/water.svg",
    lore: "Beneath the marsh lies an archive built before the rune schools divided. Its bells remember who first broke the Sigil."
  },
  {
    number: 3,
    title: "The Stormbound Vault",
    subtitle: "Rivals gather where the first half of the Sigil is sealed.",
    icon: "./assets/runes/lightning.svg",
    lore: "The vault opens only for a mage who can command every school without being consumed by any one of them."
  },
  {
    number: 4,
    title: "The Wild Crown",
    subtitle: "The second shard has rooted itself inside a living temple.",
    icon: "./assets/runes/fire.svg",
    lore: "Wild magic is not evil, but it remembers freedom. The closer the Sigil comes to wholeness, the harder the realm fights its return."
  },
  {
    number: 5,
    title: "The Rift Ascendant",
    subtitle: "Carry both halves beyond the broken throne and seal the sky.",
    icon: "./assets/runes/shadow.svg",
    lore: "The Rift Magus has been drawing power through the fracture for years. Every rival on the road was a test, a warning, or a pawn."
  }
];

export const STORY_LEVELS = [
  level(1, 1, "Mossbound Gate", "Elda the Gatekeeper", "forest-warden",
    "The western ward has grown into a maze of roots. Elda will open it only for a mage the road itself accepts.",
    "Elda begins with a cluttered board.",
    "\"The gate does not care about your name. Show it what your runes remember.\"",
    "The roots withdraw, revealing the first mark of the lost Sigil.",
    "Roadwarden's Mark",
    { enemyHp: 65, enemyJunk: 5, aiSpeed: 5200, aiAccuracy: 0.35 },
    { health: 40, combo: 2, time: 110000 }),
  level(2, 1, "Ember Steps", "Brann of Cinders", "ember-crown",
    "Fresh lava cuts across the mountain stair. Brann claims the fracture chose fire, and therefore chose him.",
    "Your Fire runes are empowered.",
    "\"Keep up, road-mage. The mountain buries anyone who hesitates.\"",
    "Brann laughs as he yields a coal-bright fragment of the road map.",
    "Cinder Compass",
    { enemyHp: 72, aiSpeed: 5000, aiAccuracy: 0.4, playerRuneBoost: { fire: 1.35 } },
    { health: 45, combo: 2, time: 105000 }),
  level(3, 1, "Tidal Archive", "Mira Tidecaller", "tide-caller",
    "Flooded shelves conceal the first record of the Sigil's breaking. Mira has sworn that no surface mage will read it.",
    "Mira starts behind a Water ward.",
    "\"Knowledge survives because someone decides who is ready to carry it.\"",
    "Mira parts the water and reveals a page naming the vanished Rift Magus.",
    "Archive Leaf",
    { enemyHp: 76, enemyShield: 12, aiSpeed: 4800, aiAccuracy: 0.45, enemyRuneBoost: { water: 1.25 } },
    { health: 45, combo: 2, time: 100000 }),
  level(4, 1, "Windglass Bridge", "Nim the Swift", "frost-weaver",
    "A glass bridge turns in the storm above the drowned valley. Nim races its shifting spans for sport.",
    "Nim places runes a little faster.",
    "\"The next step is always there. You only lose when you stare at the gap.\"",
    "Nim points toward the moonlit fen, where the stolen shard left a violet wake.",
    "Windglass Lens",
    { enemyHp: 78, aiSpeed: 4500, aiAccuracy: 0.48 },
    { health: 50, combo: 2, time: 100000 }),

  level(5, 2, "Stonewake Hall", "Torren Stonebinder", "stone-binder",
    "Ancient statues wake as the moon rises. Torren has held the hall alone since the first tremor.",
    "Both rivals begin shielded.",
    "\"Power without a ward is only another kind of collapse.\"",
    "Torren lowers the stone sentinels and names you Warden of the road.",
    "Stonewake Seal",
    { enemyHp: 82, enemyShield: 14, playerShield: 8, aiSpeed: 4500, aiAccuracy: 0.5, enemyRuneBoost: { earth: 1.2 } },
    { health: 50, combo: 2, time: 95000 }),
  level(6, 2, "Moonlit Fen", "Sable Oracle", "shadow-oracle",
    "False lights drift above the black water. Sable has seen a future in which you restore the Sigil and doom the realm.",
    "Three junk stones begin on your board.",
    "\"I have watched you win this duel. I have also watched what comes after.\"",
    "Sable's vision fractures, leaving one impossible image: Kael holding half the Sigil.",
    "Oracle's Thread",
    { enemyHp: 80, playerJunk: 3, aiSpeed: 4300, aiAccuracy: 0.52, enemyRuneBoost: { shadow: 1.2 } },
    { health: 50, combo: 2, time: 95000 }),
  level(7, 2, "Thunder Run", "Vey Stormrunner", "storm-runner",
    "Lightning walks the mountain pass in living columns. Vey rides each strike closer to the vault.",
    "Lightning magic is stronger for everyone.",
    "\"No prophecy outruns thunder. Race me to the truth.\"",
    "Vey concedes the lead and gives you a storm-key taken from the Magus's scouts.",
    "Storm Key",
    { enemyHp: 86, aiSpeed: 4200, aiAccuracy: 0.55, playerRuneBoost: { lightning: 1.25 }, enemyRuneBoost: { lightning: 1.25 } },
    { health: 50, combo: 2, time: 90000 }),
  level(8, 2, "Jade Observatory", "Ilyra the Seer", "jade-seer",
    "The observatory charts wounds in the sky instead of stars. Ilyra says the largest one is beginning to look back.",
    "You begin with less health but extra shield.",
    "\"The heavens are not opening. Something on the other side is pulling.\"",
    "The star-map aligns with the storm-key and marks the entrance to the first vault.",
    "Jade Star Map",
    { playerHp: 82, playerShield: 14, enemyHp: 80, aiSpeed: 4200, aiAccuracy: 0.56 },
    { health: 55, combo: 2, time: 90000 }),

  level(9, 3, "Ashen Library", "Orrin Ashcloak", "ash-magus",
    "Burned spellbooks whisper the names of their last readers. Orrin has pieced together the Magus's forbidden method.",
    "Orrin's Fire and Shadow magic are empowered.",
    "\"The Sigil did not shatter by accident. Someone taught it how to break.\"",
    "Orrin surrenders the final cipher, though every page bearing the Magus's true name turns to ash.",
    "Ashen Cipher",
    { enemyHp: 88, aiSpeed: 4000, aiAccuracy: 0.58, enemyRuneBoost: { fire: 1.2, shadow: 1.2 } },
    { health: 50, combo: 2, time: 90000 }),
  level(10, 3, "The First Vault", "Kael the Challenger", "ember-crown",
    "Kael waits inside the opened vault with half the Sigil bound to his gauntlet. He insists he took it to keep it from you.",
    "Kael begins fortified behind a ward and loose junk.",
    "\"Every rival you defeated made you stronger. Did you never wonder who cleared the road ahead of you?\"",
    "Kael yields the first half, but warns that the Sigil has begun choosing its own bearer.",
    "First Sigil Half",
    { enemyHp: 95, enemyShield: 10, enemyJunk: 2, aiSpeed: 3800, aiAccuracy: 0.62 },
    { health: 55, combo: 2, time: 90000 }),
  level(11, 3, "Frostfall Court", "Ysra Frostweaver", "frost-weaver",
    "The first Sigil half draws winter around itself. Ysra offers to freeze it forever before it can corrupt another mage.",
    "Water and Air runes strike harder for you.",
    "\"Some doors deserve to remain closed, even when heroes hold the key.\"",
    "Ysra thaws the northern road and admits the shard answers to your restraint, not your strength.",
    "Frostbound Oath",
    { enemyHp: 90, playerRuneBoost: { water: 1.25, air: 1.25 }, aiSpeed: 3900, aiAccuracy: 0.62 },
    { health: 55, combo: 2, time: 88000 }),
  level(12, 3, "Cinder Market", "Rook the Ruby", "ruby-duelist",
    "Rift-touched relics are being sold in the crowded night market. Rook owns the only compass that points toward the second shard.",
    "Both boards begin with loose junk.",
    "\"Nothing is priceless. Heroes simply arrive before the bidding ends.\"",
    "Rook trades the compass for the story of the vault, then quietly returns the price.",
    "Ruby Compass",
    { enemyHp: 94, playerJunk: 3, enemyJunk: 4, aiSpeed: 3700, aiAccuracy: 0.65 },
    { health: 55, combo: 2, time: 88000 }),

  level(13, 4, "Nomad's Crossing", "Amon Starwalker", "arcane-nomad",
    "The compass leads through a camp that moves between moments. Amon tests whether you can adapt before the road changes again.",
    "All enemy spells gain a small power boost.",
    "\"A complete Sigil is a cage. Convince me the realm still needs one.\"",
    "Amon sees balance in your rune craft and opens a path through the moving horizon.",
    "Nomad's Passage",
    { enemyHp: 96, enemyPower: 1.12, aiSpeed: 3600, aiAccuracy: 0.68 },
    { health: 55, combo: 2, time: 85000 }),
  level(14, 4, "Sunken Belfry", "Mira Ascendant", "tide-caller",
    "The drowned bells ring for the first time in a century. Mira returns, now carrying the archive's full tide.",
    "Mira begins shielded and Water magic surges.",
    "\"The archive chose to rise. This time, I fight with everything it remembers.\"",
    "The last bell sounds and roots burst from the lake, pointing toward the Verdant Crown.",
    "Belfry Resonance",
    { enemyHp: 100, enemyShield: 16, enemyRuneBoost: { water: 1.35 }, aiSpeed: 3500, aiAccuracy: 0.7 },
    { health: 55, combo: 2, time: 85000 }),
  level(15, 4, "The Verdant Crown", "Elda Thornqueen", "forest-warden",
    "Roots have swallowed an entire rune temple. The shard has crowned Elda its guardian and magnified every old fear.",
    "Earth magic is stronger and both boards are crowded.",
    "\"You asked the road to trust you. Now ask the wild itself.\"",
    "Elda breaks the living crown and frees the second half before it can root through her heart.",
    "Thornqueen's Mercy",
    { enemyHp: 102, playerJunk: 4, enemyJunk: 5, playerRuneBoost: { earth: 1.2 }, enemyRuneBoost: { earth: 1.3 }, aiSpeed: 3400, aiAccuracy: 0.72 },
    { health: 55, combo: 3, time: 85000 }),
  level(16, 4, "Stormspire", "Vey Thunderborn", "storm-runner",
    "Both Sigil halves pull toward the storm's eye. Vey stands between them, charged with power stolen directly from the Rift.",
    "Vey is fast and begins with a charged shield.",
    "\"If the sky wants a champion, it can survive both of us.\"",
    "The storm breaks. The two halves join, and a path of violet fire appears beyond the broken throne.",
    "Restored Sigil",
    { enemyHp: 105, enemyShield: 18, aiSpeed: 3000, aiAccuracy: 0.75, enemyRuneBoost: { lightning: 1.3 } },
    { health: 60, combo: 3, time: 82000 }),

  level(17, 5, "The Hollow Moon", "Sable Nightseer", "shadow-oracle",
    "A false moon hangs over the final road. Sable returns to stop the future she once feared from becoming inevitable.",
    "You begin cursed with six junk stones.",
    "\"I was wrong about the ending. I was only wrong about who must choose it.\"",
    "Sable shatters the false moon and gives you the one future the Magus cannot see.",
    "Unwritten Future",
    { enemyHp: 100, playerJunk: 6, aiSpeed: 3100, aiAccuracy: 0.78, enemyRuneBoost: { shadow: 1.35 } },
    { health: 55, combo: 3, time: 82000 }),
  level(18, 5, "Celestial Steps", "Nova the Apprentice", "star-apprentice",
    "An unlikely young champion guards the final ascent. Nova believes defeating you is the only way to keep everyone else safe.",
    "Your health is reduced, but every spell is stronger.",
    "\"All the legends climbed past people like me. I want to know if they ever looked back.\"",
    "Nova stands aside, no longer an apprentice, and promises to hold the road until you return.",
    "Starlit Promise",
    { playerHp: 78, playerPower: 1.22, enemyHp: 105, aiSpeed: 2900, aiAccuracy: 0.8 },
    { health: 55, combo: 3, time: 80000 }),
  level(19, 5, "The Broken Throne", "Kael Sigilbound", "ember-crown",
    "Kael has taken the restored Sigil. He believes one bearer must command it before the Rift can claim them both.",
    "Kael starts heavily shielded and empowered.",
    "\"I will not let the realm gamble everything on your hope. Take it from me if you must.\"",
    "Kael releases the Sigil and joins his fire to your ward, holding the throne together for one last duel.",
    "Rival's Bond",
    { enemyHp: 110, enemyShield: 22, enemyPower: 1.18, aiSpeed: 2600, aiAccuracy: 0.86 },
    { health: 60, combo: 3, time: 78000 }),
  level(20, 5, "Heart of the Rift", "The Rift Magus", "moon-sage",
    "Beyond the throne waits the mage who shattered the Sigil. The Rift has worn their face for so long that neither remembers who invited the other.",
    "Final duel: crowded boards, high shields, and empowered magic.",
    "\"Balance made the realm small. Break your little seal and I will show you a sky without endings.\"",
    "The Sigil closes around the Rift instead of the realm. Magic remains free, but the hunger beyond the sky is finally silent.",
    "Warden of the Six",
    { playerJunk: 4, enemyJunk: 6, playerShield: 12, enemyShield: 25, enemyHp: 120, enemyPower: 1.22, aiSpeed: 2300, aiAccuracy: 0.92 },
    { health: 60, combo: 3, time: 75000 })
];

function level(
  number,
  chapter,
  title,
  opponent,
  avatarId,
  description,
  quirk,
  challenge,
  victory,
  reward,
  rules,
  goals
) {
  return {
    number,
    chapter,
    title,
    opponent,
    avatarId,
    description,
    quirk,
    challenge,
    victory,
    defeat: `${opponent} still bars the road. Rework your rune plan and challenge them again.`,
    reward,
    rules,
    goals
  };
}

export function getStoryLevel(number) {
  return STORY_LEVELS.find((levelData) => levelData.number === Number(number)) ?? STORY_LEVELS[0];
}

export function getStoryChapter(number) {
  return STORY_CHAPTERS.find((chapter) => chapter.number === Number(number)) ?? STORY_CHAPTERS[0];
}

export function storyObjectiveLabels(levelData) {
  const goals = levelData?.goals ?? {};
  const health = Number(goals.health ?? 50);
  const combo = Number(goals.combo ?? 2);
  const seconds = Math.round(Number(goals.time ?? 90000) / 1000);
  return [
    "Win the duel",
    `Finish with at least ${health}% health`,
    `Create a ${combo}x chain or win within ${formatTime(seconds)}`
  ];
}

export function storyRatingFor(levelData, summary = {}, won = false) {
  if (!won) return 0;
  const goals = levelData?.goals ?? {};
  let stars = 1;
  if (Number(summary.hpPercent ?? 0) >= Number(goals.health ?? 50)) stars += 1;
  if (
    Number(summary.largestCombo ?? 0) >= Number(goals.combo ?? 2) ||
    Number(summary.elapsedMs ?? Infinity) <= Number(goals.time ?? 90000)
  ) {
    stars += 1;
  }
  return Math.min(3, stars);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
