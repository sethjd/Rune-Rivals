const AUDIO_KEY = "rune-rivals-audio-muted";

export class AudioManager {
  constructor() {
    this.muted = localStorage.getItem(AUDIO_KEY) === "true";
    this.musicTimer = null;
    this.step = 0;
  }

  async activate() {
    if (this.muted) return;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.34;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.startMusic();
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem(AUDIO_KEY, String(this.muted));
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.34, this.context.currentTime, 0.03);
    if (!this.muted) this.activate();
    return this.muted;
  }

  startMusic() {
    if (this.musicTimer || this.muted || !this.context) return;
    const melody = [220, 261.63, 329.63, 293.66, 246.94, 329.63, 392, 293.66, 220, 261.63, 349.23, 329.63, 246.94, 293.66, 261.63, 196];
    const bass = [110, 110, 98, 98, 87.31, 87.31, 98, 98];
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.context) return;
      const note = melody[this.step % melody.length];
      this.piano(note, 0.85, 0.08);
      if (this.step % 2 === 0) this.piano(bass[Math.floor(this.step / 2) % bass.length], 1.25, 0.045);
      this.step += 1;
    }, 520);
  }

  playMove() {
    this.tone(180, 0.035, "square", 0.025, 80);
  }

  playDrop() {
    this.tone(120, 0.12, "triangle", 0.1, -55);
  }

  playMatch(combo = 1) {
    const root = 330 * Math.min(1.5, 1 + (combo - 1) * 0.15);
    [root, root * 1.25, root * 1.5].forEach((frequency, index) => {
      window.setTimeout(() => this.piano(frequency, 0.5, 0.11), index * 55);
    });
  }

  playSpell(type) {
    const sounds = {
      fire: [180, 540],
      water: [420, -180],
      earth: [105, 40],
      air: [620, 260],
      lightning: [760, -520],
      shadow: [150, -70]
    };
    const [start, sweep] = sounds[type] ?? sounds.fire;
    const wave = type === "lightning" ? "sawtooth" : type === "water" || type === "air" ? "sine" : "triangle";
    this.tone(start, 0.34, wave, 0.18, sweep);
  }

  playVictory() {
    [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      window.setTimeout(() => this.piano(frequency, 1.2, 0.15), index * 130);
    });
  }

  playDefeat() {
    [293.66, 246.94, 196, 146.83].forEach((frequency, index) => {
      window.setTimeout(() => this.piano(frequency, 1, 0.1), index * 150);
    });
  }

  piano(frequency, duration, volume) {
    if (this.muted || !this.context) return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    const body = this.context.createOscillator();
    const shimmer = this.context.createOscillator();
    body.type = "triangle";
    shimmer.type = "sine";
    body.frequency.value = frequency;
    shimmer.frequency.value = frequency * 2.01;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    body.connect(gain);
    shimmer.connect(gain);
    gain.connect(this.master);
    body.start(now);
    shimmer.start(now);
    body.stop(now + duration);
    shimmer.stop(now + duration);
  }

  tone(frequency, duration, type, volume, sweep = 0) {
    if (this.muted || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(40, frequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + sweep), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
