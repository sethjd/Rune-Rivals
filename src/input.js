export class InputController {
  constructor(onAction, onPause, onSwap) {
    this.onAction = onAction;
    this.onPause = onPause;
    this.onSwap = onSwap;
    this.boundKeydown = (event) => this.handleKeydown(event);
    window.addEventListener("keydown", this.boundKeydown);

    for (const button of document.querySelectorAll("[data-control]")) {
      const action = button.dataset.control;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.onAction(action);
        if (navigator.vibrate) navigator.vibrate(12);
      });
    }
  }

  handleKeydown(event) {
    const actions = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "rotate",
      ArrowDown: "down",
      " ": "hard-drop",
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
