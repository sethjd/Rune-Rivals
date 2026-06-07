const AUDIO_KEY = "rune-rivals-audio-muted";
const MUSIC_LOOKAHEAD_MS = 70;
const MUSIC_SCHEDULE_AHEAD = 0.32;
const MUSIC_FADE_SECONDS = 0.24;

const CHAPTER_THEMES = {
  1: {
    id: "waking-roads",
    title: "Roads Remember",
    description: "Warm strings, wooden pulse, and an old travelling melody.",
    bpm: 82,
    root: 50,
    progression: [
      [0, [0, 3, 7, 10]],
      [-2, [0, 3, 7, 10]],
      [3, [0, 4, 7, 11]],
      [5, [0, 3, 7, 10]]
    ],
    melody: [12, null, 15, 17, 19, null, 17, 15, 12, 10, 12, null, 15, 14, 10, null],
    arp: [0, 2, 1, 3, 2, 1, 0, 2],
    padWave: "triangle",
    leadWave: "sine",
    arpWave: "triangle",
    filter: 1800,
    battleTempo: 1.08,
    drumStyle: "march"
  },
  2: {
    id: "drowned-moon",
    title: "Bells Beneath Black Water",
    description: "Distant bells, tidal bass, and a melody heard through flooded stone.",
    bpm: 68,
    root: 45,
    progression: [
      [0, [0, 3, 7, 10]],
      [-5, [0, 3, 7, 10]],
      [-2, [0, 4, 7, 10]],
      [-7, [0, 3, 7, 10]]
    ],
    melody: [19, null, null, 15, 14, null, 12, null, 10, null, 12, 15, 17, null, 14, null],
    arp: [0, 3, 1, 2, 3, 1, 0, 2],
    padWave: "sine",
    leadWave: "triangle",
    arpWave: "sine",
    filter: 1250,
    battleTempo: 1.12,
    drumStyle: "tide"
  },
  3: {
    id: "stormbound-vault",
    title: "The Vault Answers",
    description: "Charged arpeggios, metallic rhythm, and a rising vault motif.",
    bpm: 104,
    root: 42,
    progression: [
      [0, [0, 3, 7, 10]],
      [3, [0, 4, 7, 10]],
      [-2, [0, 3, 7, 10]],
      [5, [0, 3, 7, 10]]
    ],
    melody: [12, 15, 19, null, 22, 19, 17, null, 15, 17, 19, 24, 22, null, 19, 17],
    arp: [0, 1, 2, 1, 3, 2, 1, 2],
    padWave: "sawtooth",
    leadWave: "square",
    arpWave: "sawtooth",
    filter: 2450,
    battleTempo: 1.12,
    drumStyle: "storm"
  },
  4: {
    id: "wild-crown",
    title: "Root, Flame, Crown",
    description: "Deep ritual drums, restless strings, and a fierce living refrain.",
    bpm: 90,
    root: 40,
    progression: [
      [0, [0, 3, 7, 10]],
      [1, [0, 4, 7, 10]],
      [-2, [0, 3, 7, 10]],
      [3, [0, 4, 7, 11]]
    ],
    melody: [12, 13, 15, 19, 18, 15, 13, null, 12, 15, 20, 19, 15, 13, 12, null],
    arp: [0, 1, 2, 3, 2, 1, 3, 1],
    padWave: "triangle",
    leadWave: "sawtooth",
    arpWave: "triangle",
    filter: 2050,
    battleTempo: 1.14,
    drumStyle: "ritual"
  },
  5: {
    id: "rift-ascendant",
    title: "Beyond the Broken Sky",
    description: "Arcane choir, fractured pulse, and the campaign's final theme.",
    bpm: 74,
    root: 48,
    progression: [
      [0, [0, 3, 7, 11]],
      [-1, [0, 3, 7, 10]],
      [-5, [0, 4, 7, 11]],
      [2, [0, 3, 6, 10]]
    ],
    melody: [12, null, 19, 18, 15, null, 14, 11, 12, 15, 19, 23, 22, 18, 15, null],
    arp: [0, 3, 2, 1, 3, 1, 2, 0],
    padWave: "sine",
    leadWave: "triangle",
    arpWave: "square",
    filter: 1550,
    battleTempo: 1.16,
    drumStyle: "rift"
  }
};

const GENERAL_THEMES = {
  menu: {
    id: "hall-of-rivals",
    title: "Hall of Rivals",
    description: "A restrained arcane overture.",
    bpm: 76,
    root: 45,
    progression: [
      [0, [0, 3, 7, 10]],
      [3, [0, 4, 7, 10]],
      [-2, [0, 3, 7, 10]],
      [5, [0, 3, 7, 10]]
    ],
    melody: [12, null, 15, null, 19, 17, 15, null, 10, 12, 15, 14, 12, null, 10, null],
    arp: [0, 2, 1, 3, 2, 1, 0, 1],
    padWave: "triangle",
    leadWave: "sine",
    arpWave: "sine",
    filter: 1650,
    battleTempo: 1.08,
    drumStyle: "march"
  },
  duel: {
    id: "circle-of-six",
    title: "Circle of Six",
    description: "The standard duel theme.",
    bpm: 96,
    root: 45,
    progression: [
      [0, [0, 3, 7, 10]],
      [-2, [0, 3, 7, 10]],
      [3, [0, 4, 7, 10]],
      [5, [0, 3, 7, 10]]
    ],
    melody: [12, 15, 19, 17, 15, null, 12, 10, 12, 15, 17, 19, 22, 19, 17, null],
    arp: [0, 1, 2, 3, 2, 1, 3, 1],
    padWave: "triangle",
    leadWave: "square",
    arpWave: "triangle",
    filter: 2200,
    battleTempo: 1.08,
    drumStyle: "march"
  },
  online: {
    id: "open-arenas",
    title: "Open Arenas",
    description: "A brighter competitive pulse for online play.",
    bpm: 108,
    root: 47,
    progression: [
      [0, [0, 3, 7, 10]],
      [5, [0, 3, 7, 10]],
      [3, [0, 4, 7, 10]],
      [-2, [0, 3, 7, 10]]
    ],
    melody: [12, 15, 19, 22, 19, 17, 15, null, 12, 17, 20, 19, 17, 15, 12, null],
    arp: [0, 2, 1, 3, 2, 0, 3, 1],
    padWave: "sawtooth",
    leadWave: "triangle",
    arpWave: "square",
    filter: 2350,
    battleTempo: 1.08,
    drumStyle: "storm"
  }
};

export function chapterMusicDetails(chapterNumber) {
  const theme = CHAPTER_THEMES[Number(chapterNumber)] ?? CHAPTER_THEMES[1];
  return { title: theme.title, description: theme.description };
}

export class AudioManager {
  constructor() {
    this.muted = localStorage.getItem(AUDIO_KEY) === "true";
    this.scene = "menu";
    this.chapter = 1;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicGeneration = 0;
    this.activeMusicNodes = new Set();
    this.paused = false;
  }

  async activate() {
    if (this.muted) return;
    if (!this.context) this.createAudioGraph();
    if (!this.context) return;
    if (this.context.state === "suspended") await this.context.resume();
    if (!this.musicTimer) this.restartMusic();
  }

  createAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();

    this.master = this.context.createGain();
    this.master.gain.value = 0.34;

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.2;

    this.sfxBus = this.context.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    this.reverb = this.context.createConvolver();
    this.reverb.buffer = this.createReverbImpulse(1.8, 2.8);
    this.reverbGain = this.context.createGain();
    this.reverbGain.gain.value = 0.16;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);

    this.master.connect(this.compressor);
    this.compressor.connect(this.context.destination);
    this.noiseBuffer = this.createNoiseBuffer();
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem(AUDIO_KEY, String(this.muted));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted ? 0.0001 : 0.34, this.context.currentTime, 0.03);
    }
    if (this.muted) this.stopMusic();
    else this.activate();
    return this.muted;
  }

  setMusicScene(scene, chapter = this.chapter) {
    const normalizedChapter = Math.max(1, Math.min(5, Number(chapter) || 1));
    if (this.scene === scene && this.chapter === normalizedChapter) return;
    this.scene = scene;
    this.chapter = normalizedChapter;
    if (this.context && !this.muted) this.restartMusic();
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.musicBus || !this.context) return;
    const target = this.paused ? 0.055 : this.musicVolumeForScene();
    this.musicBus.gain.setTargetAtTime(target, this.context.currentTime, 0.08);
  }

  currentMusicDetails() {
    const { theme } = this.resolveMusic();
    return { title: theme.title, description: theme.description };
  }

  resolveMusic() {
    const storyScene = this.scene.startsWith("story");
    const theme = storyScene
      ? CHAPTER_THEMES[this.chapter] ?? CHAPTER_THEMES[1]
      : GENERAL_THEMES[this.scene] ?? GENERAL_THEMES.menu;
    let variant = "ambient";
    if (this.scene === "duel" || this.scene === "online-battle" || this.scene === "story-battle") {
      variant = "battle";
    } else if (this.scene === "result" || this.scene === "story-result") {
      variant = "result";
    }
    return { theme, variant };
  }

  restartMusic() {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const oldBus = this.musicBus;
    const oldNodes = [...this.activeMusicNodes];
    this.stopScheduler();

    if (oldBus) {
      oldBus.gain.cancelScheduledValues(now);
      oldBus.gain.setValueAtTime(Math.max(0.0001, oldBus.gain.value), now);
      oldBus.gain.exponentialRampToValueAtTime(0.0001, now + MUSIC_FADE_SECONDS);
      for (const node of oldNodes) {
        try {
          node.stop(now + MUSIC_FADE_SECONDS + 0.04);
        } catch {
          // The node may already have ended.
        }
      }
      globalThis.setTimeout(() => oldBus.disconnect(), (MUSIC_FADE_SECONDS + 0.15) * 1000);
    }

    this.activeMusicNodes = new Set();
    this.musicBus = this.context.createGain();
    this.musicBus.gain.setValueAtTime(0.0001, now);
    this.musicBus.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.paused ? 0.055 : this.musicVolumeForScene()),
      now + MUSIC_FADE_SECONDS
    );
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);

    this.musicStep = 0;
    this.nextMusicStepAt = now + 0.08;
    const generation = ++this.musicGeneration;
    const schedule = () => this.scheduleMusic(generation);
    schedule();
    this.musicTimer = globalThis.setInterval(schedule, MUSIC_LOOKAHEAD_MS);
  }

  stopScheduler() {
    if (this.musicTimer) globalThis.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicGeneration += 1;
  }

  stopMusic() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.stopScheduler();
    if (this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), now);
      this.musicBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    }
    for (const node of this.activeMusicNodes) {
      try {
        node.stop(now + 0.16);
      } catch {
        // The node may already have ended.
      }
    }
    this.activeMusicNodes.clear();
  }

  musicVolumeForScene() {
    const { variant } = this.resolveMusic();
    if (variant === "battle") return 0.2;
    if (variant === "result") return 0.12;
    return 0.145;
  }

  scheduleMusic(generation) {
    if (
      generation !== this.musicGeneration ||
      this.muted ||
      !this.context ||
      !this.musicBus
    ) return;

    const { theme, variant } = this.resolveMusic();
    const tempoScale = variant === "battle"
      ? theme.battleTempo ?? 1.1
      : variant === "result"
        ? 0.88
        : 1;
    const stepDuration = 60 / (theme.bpm * tempoScale) / 2;

    while (this.nextMusicStepAt < this.context.currentTime + MUSIC_SCHEDULE_AHEAD) {
      this.scheduleMusicStep(theme, variant, this.musicStep, this.nextMusicStepAt, stepDuration);
      this.musicStep += 1;
      this.nextMusicStepAt += stepDuration;
    }
  }

  scheduleMusicStep(theme, variant, step, time, stepDuration) {
    const barStep = step % 8;
    const progressionIndex = Math.floor(step / 8) % theme.progression.length;
    const [rootOffset, chord] = theme.progression[progressionIndex];
    const root = theme.root + rootOffset;
    const isBattle = variant === "battle";

    if (barStep === 0) {
      const padDuration = stepDuration * 7.8;
      chord.slice(0, isBattle ? 4 : 3).forEach((interval, index) => {
        this.musicVoice(noteFrequency(root + interval + 12), time, padDuration, {
          wave: theme.padWave,
          volume: isBattle ? 0.018 : 0.015,
          attack: 0.16,
          release: 0.5,
          filter: theme.filter,
          detune: index % 2 ? 5 : -5,
          pan: (index - 1.5) * 0.22
        });
      });
    }

    const bassSteps = isBattle ? [0, 3, 4, 6] : [0, 4];
    if (bassSteps.includes(barStep)) {
      const passing = isBattle && barStep === 6 ? 7 : 0;
      this.musicVoice(noteFrequency(root + passing - 12), time, stepDuration * 1.65, {
        wave: "triangle",
        volume: isBattle ? 0.055 : 0.038,
        attack: 0.008,
        release: 0.12,
        filter: 520
      });
    }

    const shouldArpeggiate = isBattle || barStep % 2 === 0;
    if (shouldArpeggiate) {
      const arpIndex = theme.arp[step % theme.arp.length] % chord.length;
      this.musicVoice(noteFrequency(root + chord[arpIndex] + 12), time, stepDuration * 0.78, {
        wave: theme.arpWave,
        volume: isBattle ? 0.027 : 0.018,
        attack: 0.005,
        release: 0.08,
        filter: theme.filter * 1.35,
        pan: barStep % 2 ? 0.26 : -0.26
      });
    }

    const melodyInterval = theme.melody[step % theme.melody.length];
    const playMelody = melodyInterval !== null && (isBattle || barStep % 2 === 0 || barStep === 3);
    if (playMelody) {
      this.musicVoice(noteFrequency(root + melodyInterval), time, stepDuration * (isBattle ? 1.4 : 1.8), {
        wave: theme.leadWave,
        volume: isBattle ? 0.034 : 0.027,
        attack: 0.018,
        release: 0.18,
        filter: theme.filter * 1.55,
        shimmer: theme.id === "drowned-moon" || theme.id === "rift-ascendant",
        pan: Math.sin(step * 0.7) * 0.18
      });
    }

    if (isBattle) this.scheduleDrums(theme.drumStyle, barStep, time, stepDuration);
  }

  scheduleDrums(style, step, time, stepDuration) {
    const heavyKick = style === "ritual" || style === "rift";
    if (step === 0 || step === 4 || (style === "storm" && step === 6)) {
      this.musicKick(time, heavyKick ? 0.075 : 0.055);
    }
    if (step === 2 || step === 6) {
      this.musicNoise(time, 0.09, style === "tide" ? 0.018 : 0.028, style === "storm" ? 4200 : 2300);
    }
    if (style === "storm" || style === "rift") {
      this.musicNoise(time, stepDuration * 0.3, 0.009, 7200);
    } else if (style === "march" && step % 2 === 1) {
      this.musicNoise(time, stepDuration * 0.22, 0.006, 5800);
    }
  }

  musicVoice(frequency, time, duration, {
    wave = "triangle",
    volume = 0.03,
    attack = 0.01,
    release = 0.15,
    filter = 1800,
    detune = 0,
    shimmer = false,
    pan = 0
  } = {}) {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filterNode = this.context.createBiquadFilter();
    const panner = this.context.createStereoPanner?.();
    const end = time + duration;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.detune.setValueAtTime(detune, time);
    filterNode.type = "lowpass";
    filterNode.frequency.setValueAtTime(filter, time);
    filterNode.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), time + attack);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * 0.76), Math.max(time + attack, end - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(filterNode);
    filterNode.connect(gain);
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), time);
      gain.connect(panner);
      panner.connect(this.musicBus);
    } else {
      gain.connect(this.musicBus);
    }

    oscillator.start(time);
    oscillator.stop(end + 0.03);
    this.trackMusicNode(oscillator);

    if (shimmer) {
      const overtone = this.context.createOscillator();
      const shimmerGain = this.context.createGain();
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(frequency * 2.005, time);
      shimmerGain.gain.setValueAtTime(0.0001, time);
      shimmerGain.gain.exponentialRampToValueAtTime(volume * 0.22, time + attack * 1.5);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, end);
      overtone.connect(shimmerGain);
      shimmerGain.connect(this.musicBus);
      overtone.start(time);
      overtone.stop(end + 0.03);
      this.trackMusicNode(overtone);
    }
  }

  musicKick(time, volume) {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(110, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(gain);
    gain.connect(this.musicBus);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
    this.trackMusicNode(oscillator);
  }

  musicNoise(time, duration, volume, filterFrequency) {
    if (!this.context || !this.musicBus || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filterNode = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    filterNode.type = "highpass";
    filterNode.frequency.setValueAtTime(filterFrequency, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filterNode);
    filterNode.connect(gain);
    gain.connect(this.musicBus);
    source.start(time);
    source.stop(time + duration + 0.02);
    this.trackMusicNode(source);
  }

  trackMusicNode(node) {
    this.activeMusicNodes.add(node);
    node.onended = () => this.activeMusicNodes.delete(node);
  }

  createNoiseBuffer() {
    const length = Math.floor(this.context.sampleRate * 0.25);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  createReverbImpulse(duration, decay) {
    const length = Math.floor(this.context.sampleRate * duration);
    const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  playMove() {
    this.tone(180, 0.035, "square", 0.025, 80);
  }

  playDrop() {
    this.tone(120, 0.12, "triangle", 0.1, -55);
  }

  playHold() {
    this.tone(260, 0.12, "sine", 0.07, 180);
    globalThis.setTimeout(() => this.tone(440, 0.1, "triangle", 0.05, -80), 55);
  }

  playSurgeReady() {
    if (this.muted || !this.context) return;
    const now = this.context.currentTime;
    this.toneAt(196, now, 0.42, "sine", 0.065, 390);
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.bellAt(frequency, now + 0.08 + index * 0.075, 0.72, 0.09 - index * 0.009);
    });
  }

  playMatch(combo = 1) {
    const root = 330 * Math.min(1.5, 1 + (combo - 1) * 0.15);
    [root, root * 1.25, root * 1.5].forEach((frequency, index) => {
      globalThis.setTimeout(() => this.piano(frequency, 0.5, 0.11), index * 55);
    });
  }

  playSpell(type) {
    const sounds = {
      fire: [180, 540],
      water: [420, -180],
      earth: [105, 40],
      air: [620, 260],
      lightning: [760, -520],
      shadow: [150, -70],
      arcane: [220, 880]
    };
    const [start, sweep] = sounds[type] ?? sounds.fire;
    const wave = type === "lightning" ? "sawtooth" : type === "water" || type === "air" ? "sine" : "triangle";
    this.tone(start, 0.34, wave, 0.18, sweep);
  }

  playVictory() {
    [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      globalThis.setTimeout(() => this.piano(frequency, 1.2, 0.15), index * 130);
    });
  }

  playDefeat() {
    [293.66, 246.94, 196, 146.83].forEach((frequency, index) => {
      globalThis.setTimeout(() => this.piano(frequency, 1, 0.1), index * 150);
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
    gain.connect(this.sfxBus);
    body.start(now);
    shimmer.start(now);
    body.stop(now + duration);
    shimmer.stop(now + duration);
  }

  bellAt(frequency, time, duration, volume) {
    if (this.muted || !this.context) return;
    const gain = this.context.createGain();
    const fundamental = this.context.createOscillator();
    const overtone = this.context.createOscillator();
    fundamental.type = "sine";
    overtone.type = "sine";
    fundamental.frequency.setValueAtTime(frequency, time);
    overtone.frequency.setValueAtTime(frequency * 2.73, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    fundamental.connect(gain);
    overtone.connect(gain);
    gain.connect(this.sfxBus);
    gain.connect(this.reverb);
    fundamental.start(time);
    overtone.start(time);
    fundamental.stop(time + duration);
    overtone.stop(time + duration);
  }

  tone(frequency, duration, type, volume, sweep = 0) {
    if (this.muted || !this.context) return;
    this.toneAt(frequency, this.context.currentTime, duration, type, volume, sweep);
  }

  toneAt(frequency, time, duration, type, volume, sweep = 0) {
    if (this.muted || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(40, frequency), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + sweep), time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.sfxBus);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }
}

function noteFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
