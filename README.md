# Rune Rivals

Rune Rivals is an original falling-rune puzzle battler built with plain HTML, CSS, and modular JavaScript. Drop pairs of magical runes, connect groups of three or more, trigger chain reactions, and cast spells against an AI or an online rival.

This repository contains a playable prototype designed for GitHub Pages and installable as a Progressive Web App.

## What Works

- 8 × 14 boards with falling two-rune pieces
- Six distinct rune types plus junk tiles
- Orthogonal match-3 groups, gravity, and chain combos
- Fireball, Cleanse, Stone Shield, Gust, Chain Bolt, and Curse spells
- Faster battles with offensive pressure on every spell, stronger large groups, and steep combo scaling
- Match-resolution recovery that clears interrupted flashing runes and resumes online play
- HP, shields, board-overflow penalties, victory, defeat, pause, and rematch
- AI that scores possible placements and prefers immediate matches
- Saved player profiles with custom names and 15 original avatars
- A five-chapter, 20-level story campaign with rival dialogue, relics, lore, and battle quirks
- Adjustable AI pacing and accuracy that ramps through the story
- Original adaptive soundtrack with distinct map and battle arrangements for all five story chapters
- Layered synthesized pads, bass, melody, arpeggios, percussion, reverb, and elemental attack sounds
- A dedicated audio cue when Arcane Surge becomes ready
- Firebase Realtime Database room creation and joining
- Public lobby browser with one-tap joining and automatic stale-room filtering
- Optional hidden rooms for friend-code games
- Host-controlled online waiting rooms for 2-6 players
- Ring-based attacks, elimination retargeting, and final placement results
- Anonymous Firebase accounts for persistent online identity
- Duplicate Firebase identities are blocked from occupying multiple seats in one ranked room
- Arcane League rankings with points, crowns, podiums, and win streaks
- Match-linked leaderboard updates that reject duplicate and older room results
- Arcane Surge ultimate ability charged by spellcasting
- Mage XP, levels, ranks, wins, best-combo records, and persistent mastery
- Three-star story ratings based on health, speed, and combo performance
- Apprentice, Rival, and Archmage quick-duel tiers
- A complete in-game Spell Codex and detailed battle summaries
- Earnable battle medals for health, speed, chains, spell volume, and damage
- Premium painted arena art, danger warnings, damage numbers, and a refined battle HUD
- Responsive desktop, portrait-phone, and landscape-phone layouts
- Keyboard controls and a centered two-row mobile control deck with Hold
- PWA manifest, service worker, offline app shell, and original icons
- Original SVG rune, interface, arena, and spell artwork

## Run Locally

The game uses JavaScript modules, so serve the folder through a small local web server rather than opening `index.html` directly.

With Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Other static servers work too, including the VS Code Live Server extension.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Left / Right arrows | Left / Right buttons |
| Rotate | Up arrow | Rotate button |
| Soft drop | Down arrow | Down button |
| Hard drop | Space | Drop button |
| Hold / swap | C | Hold button |
| Pause | P | Top-right pause button |

## Enable Firebase Multiplayer

Online mode stays disabled with a friendly message until a real Firebase config is added. Offline play does not require Firebase. Public games appear in **Open Arenas**; private rooms remain available through friend codes.

1. Create a free project at [Firebase](https://console.firebase.google.com/).
2. In the project overview, add a **Web app**.
3. Open **Build → Realtime Database** and create a database.
4. Choose a database location close to your players.
5. Open **Build → Authentication → Sign-in method** and enable **Anonymous**.
6. Copy the web app configuration values into `src/firebase-config.js`.
7. Make sure `databaseURL` exactly matches the URL shown by Realtime Database.
8. Add database rules before testing.

The config object is a public web-client identifier, not an admin secret. Never add Firebase Admin SDK credentials or service-account JSON to this repository.

### Database Rules

Paste the included `firebase-rules.json` into **Realtime Database → Rules**, then publish it. The rules require an authenticated anonymous account for online rooms and lobby discovery, allow public leaderboard reads, and only let a player update their own ranking with a newer recorded placement that contains the same Firebase account.

This is stronger than the original open-room prototype, but the simulation still runs in browsers. A commercial competitive version should calculate rankings in a trusted Cloud Function or game server, rate-limit room creation, and automatically remove expired rooms.

## Deploy to GitHub Pages

1. Create a GitHub repository and place these files at the repository root.
2. Commit and push the project.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Open the Pages URL after the deployment finishes.

All project paths are relative, so the game works from a repository subpath such as `https://username.github.io/rune-rivals/`.

When changing cached files, increment `CACHE_NAME` in `service-worker.js` so installed copies refresh promptly.

## Install on a Phone

The deployed site must use HTTPS, which GitHub Pages provides.

### Android

Open the site in Chrome, then use **Install app** or **Add to Home screen**. Chrome may also show the in-game install button.

### iPhone / iPad

Open the site in Safari, tap **Share**, then choose **Add to Home Screen**.

## Project Layout

```text
index.html
manifest.webmanifest
service-worker.js
firebase-rules.json
src/
  ai.js
  board.js
  constants.js
  firebase-config.js
  game.js
  input.js
  main.js
  matching.js
  multiplayer.js
  pieces.js
  pwa.js
  profile.js
  story.js
  audio.js
  spells.js
  ui.js
styles/
  main.css
assets/
  backgrounds/
  icons/
  runes/
  spells/
  ui/
```

## Prototype Limitations

- Online rooms and leaderboard writes require Firebase Anonymous Authentication.
- Leaderboard updates are validated against finished rooms, but the browser-hosted match simulation is not fully server-authoritative.
- A disconnected player is skipped by the targeting ring; reconnecting to the same seat is not supported yet.
- Simultaneous online attacks use lightweight event queues rather than a server-authoritative simulation.
- Online rematches return both players to the menu.
- Rooms are not automatically deleted from Firebase.
- Public lobby summaries disappear from Open Arenas when their host stops updating them, but old room records still require periodic database cleanup.
- AI plans one piece at a time and does not search future pieces.
- Profiles and story progress are saved locally on each browser/device.
- Separate music/effects volume controls, accessibility audio settings, and a guided tutorial are not included yet.
- The service worker checks the network first for app code and falls back to its offline cache.

## Good Next Steps

1. Add anonymous Firebase Authentication and strict per-player database rules.
2. Add room expiry and reconnection support.
3. Add animated story dialogue scenes and mechanical relic rewards.
4. Add a short interactive tutorial and colour-blind rune patterns.
5. Add separate music/effects sliders, haptics settings, and richer spell animation.
6. Add online rematches, player display names, and match statistics.
7. Add automated gameplay and mobile-layout tests.

## Creative Notes

Rune Rivals uses falling pairs, connected rune groups, spell combat, shields, junk curses, and health-based victory. It does not use tetrominoes, completed-line clearing, or branding and assets from other puzzle games. All visual assets in this repository were created specifically for this prototype.
