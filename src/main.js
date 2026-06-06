import { RuneRivalsGame } from "./game.js";
import { InputController } from "./input.js";
import { MultiplayerClient } from "./multiplayer.js";
import { registerPWA } from "./pwa.js";
import { GameUI } from "./ui.js";

const ui = new GameUI();
const multiplayer = new MultiplayerClient();
let lastMode = "ai";
let onlineDisconnected = false;

const game = new RuneRivalsGame(ui, {
  onGameOver: (won) => {
    const message = won
      ? "Your rune craft overwhelmed the rival."
      : "The rival broke through your final ward.";
    ui.announceResult(won, message);
  },
  onNetworkSync: (state) => multiplayer.syncState(state).catch((error) => {
    console.warn("State sync paused:", error);
  }),
  onAttack: (attack) => multiplayer.sendAttack(attack).catch((error) => {
    console.warn("Attack sync paused:", error);
  })
});

new InputController(
  (action) => game.handleAction(action),
  () => game.togglePause(),
  () => game.swapDebugSide()
);

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "play-ai") startGame("ai");
  if (action === "play-debug") startGame("debug");
  if (action === "show-help") ui.showScreen("help-screen");
  if (action === "show-join") {
    document.querySelector("#join-message").textContent = "";
    ui.showScreen("join-screen");
  }
  if (action === "back-menu" || action === "confirm-exit") returnToMenu();
  if (action === "pause") game.togglePause();
  if (action === "rematch") {
    if (lastMode === "online") {
      returnToMenu();
    } else {
      startGame(lastMode);
    }
  }
  if (action === "create-room") await createRoom(button);
  if (action === "join-room") await joinRoom(button);
  if (action === "leave-room") returnToMenu();
});

document.querySelector("#room-code-input").addEventListener("input", (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

function startGame(mode, roomCode = "") {
  lastMode = mode;
  onlineDisconnected = false;
  game.start(mode, roomCode);
}

async function createRoom(button) {
  if (!multiplayer.configured) return showFirebaseMessage();
  setButtonBusy(button, true);
  try {
    const code = await multiplayer.createRoom(networkHandlers());
    document.querySelector("#room-code-display").textContent = code;
    document.querySelector("#lobby-message").textContent = "Waiting for a rival to join...";
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
    await multiplayer.joinRoom(code, networkHandlers());
  } catch (error) {
    document.querySelector("#join-message").textContent = error.message;
  } finally {
    setButtonBusy(button, false);
  }
}

function networkHandlers() {
  return {
    onReady: (code) => startGame("online", code),
    onRemoteState: (state) => game.loadRemoteState(state),
    onAttack: (attack) => game.receiveAttack(attack),
    onDisconnect: () => {
      if (onlineDisconnected) return;
      onlineDisconnected = true;
      game.stop();
      ui.announceResult(false, "Opponent disconnected. The room has been closed.");
    }
  };
}

function returnToMenu() {
  game.stop();
  multiplayer.leave();
  ui.showScreen("menu-screen");
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

registerPWA();
