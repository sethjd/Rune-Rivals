import { AudioManager } from "./audio.js";
import { RuneRivalsGame } from "./game.js";
import { InputController } from "./input.js";
import { MultiplayerClient } from "./multiplayer.js";
import { registerPWA } from "./pwa.js";
import {
  AVATARS,
  avatarDataUri,
  completeStoryLevel,
  loadProfile,
  mageLevel,
  mageRank,
  masteryProgress,
  recordBattle,
  saveProfile,
  totalStoryStars
} from "./profile.js";
import { getStoryLevel, STORY_LEVELS } from "./story.js";
import { GameUI } from "./ui.js";

const ui = new GameUI();
const multiplayer = new MultiplayerClient();
const audio = new AudioManager();
let profile = loadProfile();
let selectedAvatarId = profile.avatarId;
let selectedStoryLevel = getStoryLevel(Math.min(profile.unlockedLevel, STORY_LEVELS.length));
let lastMode = "ai";
let lastRoomCode = "";
let lastStartOptions = {};

const game = new RuneRivalsGame(ui, {
  onGameOver: (won, summary) => handleGameOver(won, summary),
  onLocalEliminated: () => multiplayer.reportElimination().catch((error) => {
    console.warn("Elimination sync paused:", error);
  }),
  onNetworkSync: (state) => multiplayer.syncState(state).catch((error) => {
    console.warn("State sync paused:", error);
  }),
  onAttack: (attack) => multiplayer.sendAttack(attack).catch((error) => {
    console.warn("Attack sync paused:", error);
  }),
  onSpell: (_side, result) => audio.playSpell(result.type),
  onMatch: (combo) => audio.playMatch(combo),
  onDrop: () => audio.playDrop()
});

new InputController(
  (action) => {
    audio.activate();
    if (action === "left" || action === "right" || action === "rotate" || action === "down") audio.playMove();
    game.handleAction(action);
  },
  () => game.togglePause(),
  () => game.swapDebugSide()
);

document.addEventListener("click", async (event) => {
  const avatarButton = event.target.closest("[data-avatar]");
  if (avatarButton) {
    selectAvatar(avatarButton.dataset.avatar);
    audio.playMove();
    return;
  }

  const levelButton = event.target.closest("[data-level]");
  if (levelButton && !levelButton.disabled) {
    selectStoryLevel(Number(levelButton.dataset.level));
    audio.playMove();
    return;
  }

  const difficultyButton = event.target.closest("[data-difficulty]");
  if (difficultyButton) {
    audio.playMove();
    startQuickDuel(difficultyButton.dataset.difficulty);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  await audio.activate();
  const action = button.dataset.action;

  if (action === "show-duel") ui.showScreen("duel-screen");
  if (action === "show-codex") ui.showScreen("codex-screen");
  if (action === "show-story") showStory();
  if (action === "play-story") startStoryLevel(selectedStoryLevel.number);
  if (action === "next-story-level") startStoryLevel(Math.min(STORY_LEVELS.length, selectedStoryLevel.number + 1));
  if (action === "show-profile") showProfile();
  if (action === "save-profile") saveProfileFromForm();
  if (action === "toggle-audio") {
    audio.toggle();
    updateAudioButtons();
  }
  if (action === "show-help") ui.showScreen("help-screen");
  if (action === "show-join") {
    document.querySelector("#join-message").textContent = "";
    ui.showScreen("join-screen");
  }
  if (action === "back-menu" || action === "confirm-exit") returnToMenu();
  if (action === "pause") game.togglePause();
  if (action === "rematch") {
    if (lastMode === "online") returnToMenu();
    else startGame(lastMode, lastRoomCode, lastStartOptions);
  }
  if (action === "create-room") await createRoom(button);
  if (action === "join-room") await joinRoom(button);
  if (action === "start-online-match") await startOnlineMatch(button);
  if (action === "leave-room") returnToMenu();
});

document.querySelector("#room-code-input").addEventListener("input", (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

document.querySelector("#profile-name-input").addEventListener("input", (event) => {
  event.target.value = event.target.value.replace(/[^\p{L}\p{N} _'-]/gu, "").slice(0, 16);
});

function startGame(mode, roomCode = "", options = {}) {
  lastMode = mode;
  lastRoomCode = roomCode;
  lastStartOptions = { ...options };
  document.querySelector('[data-action="rematch"]').classList.remove("hidden");
  hideStoryResultButtons();
  game.start(mode, roomCode, {
    playerName: profile.name,
    playerAvatar: avatarDataUri(profile.avatarId),
    ...options
  });
}

function startStoryLevel(levelNumber) {
  const level = getStoryLevel(levelNumber);
  if (level.number > profile.unlockedLevel) return;
  selectedStoryLevel = level;
  startGame("story", "", {
    storyLevel: level,
    opponentName: level.opponent,
    opponentAvatar: avatarDataUri(level.avatarId),
    rules: level.rules
  });
}

function startQuickDuel(difficulty = "normal") {
  const tiers = {
    easy: {
      opponentName: "KAEL, APPRENTICE",
      aiDifficulty: "easy",
      rules: { enemyHp: 80, aiSpeed: 5000, aiAccuracy: 0.38 }
    },
    normal: {
      opponentName: "KAEL, RUNE RIVAL",
      aiDifficulty: "normal",
      rules: { enemyHp: 100, aiSpeed: 3500, aiAccuracy: 0.7 }
    },
    hard: {
      opponentName: "KAEL, ARCHMAGE",
      aiDifficulty: "hard",
      rules: {
        enemyHp: 120,
        enemyShield: 16,
        enemyPower: 1.16,
        aiSpeed: 2200,
        aiAccuracy: 0.92
      }
    }
  };
  const tier = tiers[difficulty] ?? tiers.normal;
  startGame("ai", "", {
    ...tier,
    opponentAvatar: "./assets/portraits/kael.svg"
  });
}

function handleGameOver(won, summary = game.getBattleSummary(won)) {
  if (won) audio.playVictory();
  else audio.playDefeat();
  let stars = 0;

  let message = won
    ? "Your rune craft overwhelmed the rival."
    : "The rival broke through your final ward.";

  if (lastMode === "story") {
    if (won) {
      stars = storyRating(summary);
      profile = completeStoryLevel(profile, selectedStoryLevel.number, stars);
      renderMenuProfile();
      renderStoryMap();
      message = selectedStoryLevel.number === STORY_LEVELS.length
        ? "The rift is sealed. You restored the Shattered Sigil!"
        : `${selectedStoryLevel.opponent} is defeated. The path ahead is open.`;
    } else {
      message = `${selectedStoryLevel.opponent} holds the path. Adjust your rune craft and try again.`;
    }
    showStoryResultButtons(won);
    renderResultStars(stars, won);
  } else {
    hideStoryResultButtons();
    renderResultStars(0, false);
  }

  profile = recordBattle(profile, { won, mode: lastMode, summary });
  renderMenuProfile();
  renderBattleSummary(summary);
  ui.announceResult(won, message);
}

function showProfile() {
  selectedAvatarId = profile.avatarId;
  document.querySelector("#profile-name-input").value = profile.name;
  document.querySelector("#profile-message").textContent = "";
  renderAvatarGrid();
  updateProfilePreview();
  ui.showScreen("profile-screen");
}

function selectAvatar(avatarId) {
  selectedAvatarId = avatarId;
  updateProfilePreview();
  for (const button of document.querySelectorAll("[data-avatar]")) {
    const selected = button.dataset.avatar === avatarId;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-checked", String(selected));
  }
}

function saveProfileFromForm() {
  const name = document.querySelector("#profile-name-input").value.trim();
  if (!name) {
    document.querySelector("#profile-message").textContent = "Enter a mage name first.";
    return;
  }
  profile = saveProfile({ ...profile, name, avatarId: selectedAvatarId });
  renderMenuProfile();
  ui.showScreen("menu-screen");
}

function renderAvatarGrid() {
  const grid = document.querySelector("#avatar-grid");
  grid.innerHTML = AVATARS.map((avatar) => `
    <button class="avatar-choice ${avatar.id === selectedAvatarId ? "selected" : ""}"
      data-avatar="${avatar.id}" role="radio" aria-checked="${avatar.id === selectedAvatarId}"
      title="${avatar.name}">
      <img src="${avatarDataUri(avatar.id)}" alt="${avatar.name}">
    </button>
  `).join("");
}

function updateProfilePreview() {
  document.querySelector("#profile-preview").src = avatarDataUri(selectedAvatarId);
}

function renderMenuProfile() {
  document.querySelector("#menu-profile-name").textContent = profile.name;
  document.querySelector("#menu-profile-avatar").src = avatarDataUri(profile.avatarId);
  document.querySelector("#profile-chip small").textContent = mageRank(profile).toUpperCase();
  document.querySelector("#menu-mage-level").textContent = mageLevel(profile);
  document.querySelector("#menu-mage-rank").textContent = mageRank(profile);
  document.querySelector("#menu-story-stars").textContent = `${totalStoryStars(profile)} / 60`;
  document.querySelector("#menu-mastery-fill").style.width = `${masteryProgress(profile).percent}%`;
}

function showStory() {
  game.stop();
  multiplayer.leave();
  selectedStoryLevel = getStoryLevel(Math.min(selectedStoryLevel.number, profile.unlockedLevel));
  renderStoryMap();
  selectStoryLevel(selectedStoryLevel.number);
  ui.showScreen("story-screen");
}

function renderStoryMap() {
  const container = document.querySelector("#story-levels");
  container.innerHTML = STORY_LEVELS.map((level) => {
    const locked = level.number > profile.unlockedLevel;
    const complete = profile.completedLevels.includes(level.number);
    const stars = Number(profile.storyStars?.[level.number] ?? 0);
    return `<button class="story-node ${locked ? "locked" : ""} ${complete ? "complete" : ""}"
      data-level="${level.number}" ${locked ? "disabled" : ""}
      aria-label="Level ${level.number}: ${level.title}${locked ? ", locked" : ""}">
      <span>${level.number}</span>
      <small>${complete ? starMarkup(stars) : ""}</small>
    </button>`;
  }).join("");
}

function selectStoryLevel(levelNumber) {
  selectedStoryLevel = getStoryLevel(levelNumber);
  document.querySelector("#story-level-label").textContent = `Level ${selectedStoryLevel.number} · ${selectedStoryLevel.title}`;
  document.querySelector("#story-opponent-name").textContent = selectedStoryLevel.opponent;
  document.querySelector("#story-description").textContent = selectedStoryLevel.description;
  document.querySelector("#story-quirk").textContent = selectedStoryLevel.quirk;
  const bestStars = Number(profile.storyStars?.[selectedStoryLevel.number] ?? 0);
  document.querySelector("#story-best-stars").textContent = bestStars
    ? `Best rating: ${starText(bestStars)}`
    : "Best rating: Not completed";
  document.querySelector("#story-opponent-avatar").src = avatarDataUri(selectedStoryLevel.avatarId);
  document.querySelector("#story-play-button").disabled = selectedStoryLevel.number > profile.unlockedLevel;
  for (const node of document.querySelectorAll(".story-node")) {
    node.classList.toggle("selected", Number(node.dataset.level) === selectedStoryLevel.number);
  }
}

function showStoryResultButtons(won) {
  const nextButton = document.querySelector("#next-level-button");
  nextButton.classList.toggle("hidden", !won || selectedStoryLevel.number >= STORY_LEVELS.length);
  document.querySelector("#story-map-button").classList.remove("hidden");
  document.querySelector('[data-action="rematch"]').textContent = won ? "Replay Level" : "Try Again";
}

function hideStoryResultButtons() {
  document.querySelector("#next-level-button").classList.add("hidden");
  document.querySelector("#story-map-button").classList.add("hidden");
  document.querySelector('[data-action="rematch"]').textContent = "Rematch";
}

function storyRating(summary) {
  let stars = 1;
  if (Number(summary.hpPercent ?? 0) >= 50) stars += 1;
  if (Number(summary.largestCombo ?? 0) >= 2 || Number(summary.elapsedMs ?? Infinity) <= 90000) stars += 1;
  return Math.min(3, stars);
}

function renderResultStars(stars, visible) {
  const element = document.querySelector("#result-stars");
  element.classList.toggle("hidden", !visible);
  element.innerHTML = visible
    ? Array.from({ length: 3 }, (_, index) => (
      `<span class="${index < stars ? "earned" : ""}">&#9733;</span>`
    )).join("")
    : "";
}

function renderBattleSummary(summary = {}) {
  document.querySelector("#result-damage").textContent = Math.round(summary.damageDealt ?? 0);
  document.querySelector("#result-combo").textContent = `${Math.max(1, summary.largestCombo ?? 1)}x`;
  const totalSeconds = Math.max(0, Math.round(Number(summary.elapsedMs ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  document.querySelector("#result-time").textContent = `${minutes}:${seconds}`;
}

function starText(count) {
  return `${"\u2605".repeat(count)}${"\u2606".repeat(Math.max(0, 3 - count))}`;
}

function starMarkup(count) {
  return Array.from({ length: 3 }, (_, index) => index < count ? "&#9733;" : "&#9734;").join("");
}

async function createRoom(button) {
  if (!multiplayer.configured) return showFirebaseMessage();
  setButtonBusy(button, true);
  try {
    const code = await multiplayer.createRoom(profile, onlineHandlers());
    document.querySelector("#room-code-display").textContent = code;
    document.querySelector("#lobby-message").textContent = "Waiting for players to join...";
    ui.showScreen("lobby-screen");
  } catch (error) {
    showMenuMessage(error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

async function joinRoom(button) {
  if (!multiplayer.configured) return showFirebaseMessage();
  const code = document.querySelector("#room-code-input").value;
  if (code.length !== 6) {
    document.querySelector("#join-message").textContent = "Enter the 6-character room code.";
    return;
  }
  setButtonBusy(button, true);
  try {
    await multiplayer.joinRoom(code, profile, onlineHandlers());
    document.querySelector("#room-code-display").textContent = code;
    ui.showScreen("lobby-screen");
  } catch (error) {
    document.querySelector("#join-message").textContent = error.message;
  } finally {
    setButtonBusy(button, false);
  }
}

async function startOnlineMatch(button) {
  setButtonBusy(button, true);
  try {
    await multiplayer.startMatch();
  } catch (error) {
    document.querySelector("#lobby-message").textContent = error.message;
  } finally {
    setButtonBusy(button, false);
  }
}

function onlineHandlers() {
  return {
    onLobby: (room) => {
      renderOnlineLobby(room);
    },
    onStarted: (room) => {
      if (lastMode !== "online" || !game.running) {
        startGame("online", room.roomCode, {
          opponentName: "FINDING TARGET...",
          opponentAvatar: "./assets/portraits/kael.svg"
        });
      }
    },
    onTarget: (target) => {
      game.setOnlineTarget(target, avatarDataUri(target.avatarId));
    },
    onAttack: (attack) => game.receiveAttack(attack),
    onResult: ({ place, totalPlayers, won }) => {
      const summary = game.getBattleSummary(won);
      game.stop();
      if (won) audio.playVictory();
      else audio.playDefeat();
      profile = recordBattle(profile, { won, mode: "online", summary });
      renderMenuProfile();
      renderBattleSummary(summary);
      renderResultStars(0, false);
      hideStoryResultButtons();
      document.querySelector('[data-action="rematch"]').classList.add("hidden");
      ui.announcePlacement(place, totalPlayers);
    },
    onRoomClosed: () => {
      if (lastMode === "online" && game.running) game.stop();
      showMenuMessage("The online room was closed.");
      ui.showScreen("menu-screen");
    }
  };
}

function renderOnlineLobby(room) {
  document.querySelector("#room-code-display").textContent = room.roomCode;
  const connected = room.players.filter((player) => player.connected !== false);
  const list = document.querySelector("#lobby-player-list");
  const cards = [];

  for (let seat = 1; seat <= 6; seat += 1) {
    const player = connected.find((candidate) => candidate.seat === seat);
    if (player) {
      const badges = [
        player.id === room.playerId ? "YOU" : "",
        player.id === room.hostId ? "HOST" : ""
      ].filter(Boolean);
      cards.push(`
        <div class="lobby-player-card occupied">
          <span class="lobby-seat">${seat}</span>
          <img src="${avatarDataUri(player.avatarId)}" alt="">
          <strong>${escapeHtml(player.name)}</strong>
          <small>${[...new Set(badges)].join(" · ") || "READY"}</small>
        </div>
      `);
    } else {
      cards.push(`
        <div class="lobby-player-card empty">
          <span class="lobby-seat">${seat}</span>
          <div class="empty-avatar">+</div>
          <strong>Open Seat</strong>
          <small>Waiting...</small>
        </div>
      `);
    }
  }

  list.innerHTML = cards.join("");
  const startButton = document.querySelector("#lobby-start-button");
  startButton.classList.toggle("hidden", !room.isHost || room.status !== "waiting");
  startButton.disabled = connected.length < 2;
  document.querySelector("#lobby-message").textContent = room.status === "waiting"
    ? `${connected.length}/6 players joined${room.isHost ? ". Start when everyone is ready." : ". Waiting for the host to start."}`
    : "The match is starting...";
}

function returnToMenu() {
  game.stop();
  multiplayer.leave();
  renderMenuProfile();
  ui.showScreen("menu-screen");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function updateAudioButtons() {
  for (const button of document.querySelectorAll(".audio-toggle")) {
    button.classList.toggle("muted", audio.muted);
    button.querySelector(".audio-icon")?.replaceChildren(document.createTextNode(audio.muted ? "×" : "♪"));
    if (!button.querySelector(".audio-icon")) button.textContent = audio.muted ? "×" : "♪";
  }
}

function showFirebaseMessage() {
  showMenuMessage("Online mode needs your Firebase config. See README.md for the free setup steps.");
  ui.showScreen("menu-screen");
}

function showMenuMessage(message) {
  document.querySelector("#online-status").textContent = message;
}

function setButtonBusy(button, busy) {
  button.disabled = busy;
  button.classList.toggle("loading", busy);
}

if (!multiplayer.configured) {
  showMenuMessage("Online rooms are ready to enable after adding your Firebase config.");
}

renderMenuProfile();
renderAvatarGrid();
renderStoryMap();
selectStoryLevel(selectedStoryLevel.number);
updateAudioButtons();
registerPWA();
