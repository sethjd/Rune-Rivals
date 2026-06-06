const CACHE_NAME = "rune-rivals-v10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./src/main.js",
  "./src/game.js",
  "./src/board.js",
  "./src/pieces.js",
  "./src/matching.js",
  "./src/spells.js",
  "./src/ai.js",
  "./src/multiplayer.js",
  "./src/multiplayer-logic.js",
  "./src/firebase-config.js",
  "./src/input.js",
  "./src/ui.js",
  "./src/pwa.js",
  "./src/constants.js",
  "./src/profile.js",
  "./src/story.js",
  "./src/audio.js",
  "./manifest.webmanifest",
  "./assets/icons/app-icon.svg",
  "./assets/icons/app-icon-maskable.svg",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/app-icon-maskable-192.png",
  "./assets/icons/app-icon-maskable-512.png",
  "./assets/portraits/lyra.svg",
  "./assets/portraits/kael.svg",
  "./assets/runes/fire.svg",
  "./assets/runes/water.svg",
  "./assets/runes/earth.svg",
  "./assets/runes/air.svg",
  "./assets/runes/lightning.svg",
  "./assets/runes/shadow.svg",
  "./assets/runes/junk.svg",
  "./assets/backgrounds/duel-arena.svg",
  "./assets/spells/fireball.svg",
  "./assets/spells/cleanse.svg",
  "./assets/spells/shield.svg",
  "./assets/spells/lightning.svg",
  "./assets/spells/curse.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
