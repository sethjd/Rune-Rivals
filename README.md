# Rune Rivals

Rune Rivals is an original falling-rune puzzle battler built with plain HTML, CSS, and modular JavaScript. Drop pairs of magical runes, connect groups of three or more, trigger chain reactions, and cast spells against an AI or an online rival.

This repository contains a playable prototype designed for GitHub Pages and installable as a Progressive Web App.

## What Works

- 8 × 14 boards with falling two-rune pieces
- Six distinct rune types plus junk tiles
- Orthogonal match-3 groups, gravity, and chain combos
- Fireball, Cleanse, Stone Shield, Gust, Chain Bolt, and Curse spells
- HP, shields, board-overflow penalties, victory, defeat, pause, and rematch
- AI that scores possible placements and prefers immediate matches
- Local debug duel; press `Tab` to swap the controlled board
- Firebase Realtime Database room creation and joining
- Responsive desktop, portrait-phone, and landscape-phone layouts
- Keyboard and large touch controls
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
| Pause | P | Top-right pause button |
| Swap debug board | Tab | Keyboard only |

## Enable Firebase Multiplayer

Online mode stays disabled with a friendly message until a real Firebase config is added. Offline play does not require Firebase.

1. Create a free project at [Firebase](https://console.firebase.google.com/).
2. In the project overview, add a **Web app**.
3. Open **Build → Realtime Database** and create a database.
4. Choose a database location close to your players.
5. Copy the web app configuration values into `src/firebase-config.js`.
6. Make sure `databaseURL` exactly matches the URL shown by Realtime Database.
7. Add database rules before testing.

The config object is a public web-client identifier, not an admin secret. Never add Firebase Admin SDK credentials or service-account JSON to this repository.

### Prototype Database Rules

The included `firebase-rules.json` allows anyone who knows a room code to read and write that room:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['status', 'players'])"
      }
    }
  }
}
```

Paste these into **Realtime Database → Rules**, then publish them.

These rules are intentionally permissive for early private testing. They are not suitable for a public production game. A production version should use Firebase Authentication, validate every field, limit room creation, reject stale writes, and automatically remove expired rooms.

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

- Online state uses a simple host/guest room model and has no authentication or anti-cheat protection.
- Simultaneous online attacks use lightweight event queues rather than a server-authoritative simulation.
- Online rematches return both players to the menu.
- Rooms are not automatically deleted from Firebase.
- AI plans one piece at a time and does not search future pieces.
- Sound, settings, accessibility options, and a guided tutorial are not included yet.
- The service worker uses a cache-first app shell. During development, refresh after changing its cache version.

## Good Next Steps

1. Add anonymous Firebase Authentication and strict per-player database rules.
2. Add room expiry and reconnection support.
3. Build difficulty settings and deeper AI lookahead.
4. Add a short interactive tutorial and colour-blind rune patterns.
5. Add original sound effects, haptics settings, and richer spell animation.
6. Add online rematches, player display names, and match statistics.
7. Add automated gameplay and mobile-layout tests.

## Creative Notes

Rune Rivals uses falling pairs, connected rune groups, spell combat, shields, junk curses, and health-based victory. It does not use tetrominoes, completed-line clearing, or branding and assets from other puzzle games. All visual assets in this repository were created specifically for this prototype.
