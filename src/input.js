export class InputController {
  constructor(onAction, onPause, onSwap) {
    this.onAction = onAction;
    this.onPause = onPause;
    this.onSwap = onSwap;
    this.boundKeydown = (event) => this.handleKeydown(event);
    window.addEventListener("keydown", this.boundKeydown);
    this.layout = "classic";
    this.gesture = null;

    for (const button of document.querySelectorAll("[data-control]")) {
      const action = button.dataset.control;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.onAction(action);
        this.vibrate(12);
      });
    }

    this.swipeSurface = document.querySelector("#player-board");
    this.swipeSurface?.addEventListener("pointerdown", (event) => this.startGesture(event));
    this.swipeSurface?.addEventListener("pointermove", (event) => this.moveGesture(event));
    this.swipeSurface?.addEventListener("pointerup", (event) => this.finishGesture(event));
    this.swipeSurface?.addEventListener("pointercancel", () => {
      this.gesture = null;
    });
  }

  setLayout(layout) {
    this.layout = ["classic", "swipe", "left", "large"].includes(layout) ? layout : "classic";
    document.body.dataset.controlLayout = this.layout;
  }

  startGesture(event) {
    if (this.layout !== "swipe" || event.button !== 0) return;
    event.preventDefault();
    this.gesture = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now()
    };
    this.swipeSurface?.setPointerCapture?.(event.pointerId);
  }

  moveGesture(event) {
    if (!this.gesture || event.pointerId !== this.gesture.pointerId) return;
    event.preventDefault();
  }

  finishGesture(event) {
    if (!this.gesture || event.pointerId !== this.gesture.pointerId) return;
    event.preventDefault();
    const gesture = this.gesture;
    this.gesture = null;

    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const distanceX = Math.abs(dx);
    const distanceY = Math.abs(dy);
    const duration = Math.max(1, performance.now() - gesture.startedAt);

    if (distanceX < 14 && distanceY < 14 && duration < 420) {
      this.onAction("rotate");
      this.vibrate(10);
      return;
    }

    if (dy > 38 && distanceY > distanceX * 1.15) {
      const isFlick = dy >= 78 && duration <= 280 && dy / duration >= 0.28;
      if (isFlick) {
        this.onAction("hard-drop");
        this.vibrate(18);
      } else {
        const drops = Math.min(5, Math.max(1, Math.round(dy / 38)));
        for (let index = 0; index < drops; index += 1) this.onAction("down");
        this.vibrate(10);
      }
      return;
    }

    if (distanceX > 28 && distanceX > distanceY) {
      const action = dx < 0 ? "left" : "right";
      const moves = Math.min(4, Math.max(1, Math.round(distanceX / 48)));
      for (let index = 0; index < moves; index += 1) this.onAction(action);
      this.vibrate(10);
    }
  }

  vibrate(duration) {
    globalThis.navigator?.vibrate?.(duration);
  }

  handleKeydown(event) {
    const actions = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "rotate",
      ArrowDown: "down",
      " ": "hard-drop",
      c: "hold",
      C: "hold",
      s: "surge",
      S: "surge"
    };

    if (actions[event.key]) {
      event.preventDefault();
      this.onAction(actions[event.key]);
    } else if (event.key.toLowerCase() === "p") {
      this.onPause();
    } else if (event.key === "Tab") {
      event.preventDefault();
      this.onSwap();
    }
  }
}
