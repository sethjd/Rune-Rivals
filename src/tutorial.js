const TUTORIAL_STEPS = [
  {
    id: "move",
    title: "Move the falling runes",
    instruction: "Move once to the left or right. Use an arrow key, a button, or swipe sideways in Swipe mode.",
    actions: ["left", "right"]
  },
  {
    id: "rotate",
    title: "Rotate the pair",
    instruction: "Spin the rune pair. Use Up, the Spin button, or tap the board in Swipe mode.",
    actions: ["rotate"]
  },
  {
    id: "hold",
    title: "Save a useful pair",
    instruction: "Use Hold to store this pair and bring in the next one.",
    actions: ["hold"]
  },
  {
    id: "match",
    title: "Complete a Fire match",
    instruction: "Two Fire runes are waiting below. Hard drop the pair to connect four and cast Fireball.",
    actions: ["hard-drop"]
  },
  {
    id: "surge",
    title: "Cast Arcane Surge",
    instruction: "Your match filled the Surge meter. Press Surge to unleash your ultimate spell.",
    actions: ["surge"]
  }
];

export class TutorialController {
  constructor(game, { onComplete } = {}) {
    this.game = game;
    this.onComplete = onComplete;
    this.active = false;
    this.required = false;
    this.stepIndex = 0;
    this.coach = document.querySelector("#tutorial-coach");
    this.eyebrow = document.querySelector("#tutorial-step-label");
    this.title = document.querySelector("#tutorial-step-title");
    this.instruction = document.querySelector("#tutorial-step-instruction");
    this.progress = document.querySelector("#tutorial-progress");
    this.finishButton = document.querySelector('[data-action="finish-tutorial"]');
    this.exitButton = document.querySelector('[data-action="exit-tutorial"]');
  }

  start({ required = false } = {}) {
    this.active = true;
    this.required = Boolean(required);
    this.stepIndex = 0;
    document.body.classList.add("tutorial-active");
    document.body.classList.toggle("tutorial-required", this.required);
    this.coach.classList.remove("hidden", "complete");
    this.finishButton.classList.add("hidden");
    this.exitButton.classList.toggle("hidden", this.required);
    this.renderStep();
  }

  stop() {
    this.active = false;
    this.required = false;
    document.body.classList.remove("tutorial-active", "tutorial-required");
    document.body.removeAttribute("data-tutorial-step");
    this.coach.classList.add("hidden");
  }

  allowsAction(action) {
    if (!this.active) return true;
    return TUTORIAL_STEPS[this.stepIndex]?.actions.includes(action) ?? false;
  }

  handleAction(action) {
    if (!this.active) return;
    const step = TUTORIAL_STEPS[this.stepIndex];
    if (!step?.actions.includes(action)) return;
    if (step.id === "match") {
      this.instruction.textContent = "Great placement. Watch the connected Fire runes cast a spell.";
      return;
    }
    if (step.id === "surge") {
      this.complete();
      return;
    }
    this.advance();
  }

  handleMatch(groups) {
    if (!this.active || TUTORIAL_STEPS[this.stepIndex]?.id !== "match") return;
    if (!groups?.some((group) => group.type === "fire" && group.cells.length >= 3)) return;
    this.advance();
  }

  remind() {
    if (!this.active) return;
    this.coach.classList.remove("nudge");
    void this.coach.offsetWidth;
    this.coach.classList.add("nudge");
  }

  advance() {
    this.stepIndex = Math.min(TUTORIAL_STEPS.length - 1, this.stepIndex + 1);
    if (TUTORIAL_STEPS[this.stepIndex].id === "match") this.game.prepareTutorialMatch();
    this.renderStep();
  }

  renderStep() {
    const step = TUTORIAL_STEPS[this.stepIndex];
    document.body.dataset.tutorialStep = step.id;
    this.eyebrow.textContent = `Training ${this.stepIndex + 1} of ${TUTORIAL_STEPS.length}`;
    this.title.textContent = step.title;
    this.instruction.textContent = step.instruction;
    this.progress.innerHTML = TUTORIAL_STEPS.map((item, index) => (
      `<span class="${index < this.stepIndex ? "done" : index === this.stepIndex ? "current" : ""}"
        aria-label="${item.title}"></span>`
    )).join("");
  }

  complete() {
    this.active = false;
    document.body.removeAttribute("data-tutorial-step");
    document.body.classList.remove("tutorial-required");
    this.coach.classList.add("complete");
    this.eyebrow.textContent = "Training complete";
    this.title.textContent = "You are ready, Rune Mage";
    this.instruction.textContent = "Build groups of three or more, use Hold to plan ahead, and save Arcane Surge for the right moment.";
    this.progress.innerHTML = TUTORIAL_STEPS.map(() => '<span class="done"></span>').join("");
    this.finishButton.classList.remove("hidden");
    this.exitButton.classList.add("hidden");
    this.onComplete?.();
  }
}
