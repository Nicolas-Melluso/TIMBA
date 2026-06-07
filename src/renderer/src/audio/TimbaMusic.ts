import type { GamePhase } from "../game/types.js";
import { DEFAULT_VOLUME_LEVEL, DEFAULT_VOLUME_MULTIPLIER, MIN_AUDIBLE_GAIN, clamp, clampVolumeLevel, clampVolumeMultiplier } from "./volumeSettings.js";

type MusicMode = "menu" | "table" | "kiosk" | "blackjack" | "end";
type MacroIdentity = "menu" | "table" | "end";

const STORAGE_KEY = "timba.musicMuted";

export class TimbaMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private dangerBus: GainNode | null = null;
  private step = 0;
  private phrase = 0;
  private mode: MusicMode = "menu";
  private previousMode: MusicMode = "menu";
  private danger = 0;
  private externalDuck = 0;
  private modeBlend = 1;
  private transitionSteps = 0;
  private noiseSeed = 1337;
  private muted = readMuted();
  private started = false;
  private intervalId: number | null = null;
  private masterVolumeLevel = DEFAULT_VOLUME_LEVEL;
  private musicVolumeMultiplier = DEFAULT_VOLUME_MULTIPLIER;
  private dangerVolumeMultiplier = DEFAULT_VOLUME_MULTIPLIER;

  start(): void {
    const context = this.getContext();
    if (!context || this.started) {
      return;
    }

    this.started = true;
    this.applyVolume();
    this.tick();
    this.intervalId = window.setInterval(() => this.tick(), 320);
  }

  setGameState(phase: GamePhase, multiplier: number): void {
    const nextMode = modeForPhase(phase);
    if (nextMode !== this.mode) {
      const fromMode = this.mode;
      this.previousMode = this.mode;
      this.mode = nextMode;
      this.modeBlend = 0;
      this.transitionSteps = 0;
      this.playModeStinger(fromMode, nextMode);
    }
    this.danger = Math.max(0, Math.min(1, (1.35 - multiplier) / 1.35));
    this.applyVolume();
  }

  setDuck(amount: number): void {
    this.externalDuck = clamp01(amount);
    this.applyVolume();
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, this.muted ? "1" : "0");
    } catch {
      // LocalStorage can be unavailable in some embedded contexts.
    }
    this.applyVolume();
    if (!this.muted) {
      this.tick();
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMasterVolumeLevel(level: number): void {
    this.masterVolumeLevel = clampVolumeLevel(level);
    this.applyVolume();
  }

  getMasterVolumeLevel(): number {
    return this.masterVolumeLevel;
  }

  setMusicVolumeMultiplier(multiplier: number): void {
    this.musicVolumeMultiplier = clampVolumeMultiplier(multiplier);
    this.applyVolume();
  }

  getMusicVolumeMultiplier(): number {
    return this.musicVolumeMultiplier;
  }

  setDangerVolumeMultiplier(multiplier: number): void {
    this.dangerVolumeMultiplier = clampVolumeMultiplier(multiplier);
    this.applyVolume();
  }

  getDangerVolumeMultiplier(): number {
    return this.dangerVolumeMultiplier;
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.started = false;
  }

  destroy(): void {
    this.stop();
    if (this.musicBus) {
      this.musicBus.disconnect();
      this.musicBus = null;
    }
    if (this.dangerBus) {
      this.dangerBus.disconnect();
      this.dangerBus = null;
    }
    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }

  private tick(): void {
    const context = this.getContext();
    if (!context || !this.master || !this.musicBus || !this.dangerBus || this.muted) {
      return;
    }

    if (this.modeBlend < 1) {
      this.transitionSteps += 1;
      this.modeBlend = Math.min(1, this.transitionSteps / 9);
    }

    const now = context.currentTime;
    const currentProfile = profileForMode(this.mode);
    const previousProfile = profileForMode(this.previousMode);
    const root = lerp(previousProfile.root, currentProfile.root, this.modeBlend);
    const phraseIndex = this.phrase % currentProfile.arrangement.length;
    const phraseLift = currentProfile.arrangement[phraseIndex];
    const bassPattern = this.modeBlend < 1 && this.step % 4 < 2 ? previousProfile.bassPattern : currentProfile.bassPattern;
    const note = root * semitone(bassPattern[this.step % bassPattern.length]);
    const dynamicDrift = 1 + (this.random() - 0.5) * (0.004 + phraseLift * 0.003);

    if (this.step % 2 === 0) {
      this.playTone((note / 2) * dynamicDrift, 0.44, "triangle", 0.047 + this.danger * 0.01 + phraseLift * 0.004, now, "music");
    }

    if (this.step % 4 === 1) {
      this.playChord(root, now);
    }

    if (this.mode !== "menu" && this.step % 8 === 3) {
      const accent = note * semitone(this.step % 16 < 8 ? 12 : 7);
      this.playTone(accent, 0.22, "sine", 0.009 + phraseLift * 0.004, now + 0.02, "music");
    }

    if (this.mode !== "menu" && this.step % 2 === 1 && this.random() > 0.28 + phraseLift * 0.04) {
      this.playNoise(0.026 + this.random() * 0.012, 0.011 + this.random() * 0.007, now);
    }

    this.playDangerLayer(root, now, phraseLift);

    this.step += 1;
    if (this.step % 8 === 0) {
      this.phrase += 1;
    }
  }

  private playChord(root: number, start: number): void {
    const profile = profileForMode(this.mode);
    const previousProfile = profileForMode(this.previousMode);
    const intervals = this.modeBlend < 1 && this.step % 8 < 3 ? previousProfile.chord : profile.chord;
    intervals.forEach((interval, index) => {
      const detuneDrift = 1 + (this.random() - 0.5) * 0.004;
      this.playTone(root * semitone(interval) * detuneDrift, 0.58 + this.random() * 0.08, "sine", 0.016 + this.random() * 0.002, start + index * 0.012, "music");
    });
  }

  private playDangerLayer(root: number, start: number, phraseLift: number): void {
    if (this.danger < 0.24 || this.mode === "menu") {
      return;
    }

    const heartbeatPeriod = this.danger > 0.72 ? 4 : 8;
    if (this.step % heartbeatPeriod === 0) {
      this.playTone(root / 2, 0.34, "triangle", 0.012 + this.danger * 0.03 + phraseLift * 0.005, start, "danger");
      if (this.danger > 0.64) {
        this.playTone(root / 4, 0.46, "sine", 0.007 + this.danger * 0.018, start + 0.075, "danger");
      }
    }

    if (this.danger > 0.58 && this.step % 8 === 6) {
      this.playTone(61.74 * (1 + this.random() * 0.006), 0.22, "sine", 0.026 + this.danger * 0.018, start, "danger");
    }

    if (this.danger > 0.78 && this.step % 4 === 2) {
      const sweep = 196 * (1 + this.random() * 0.012);
      this.playTone(sweep, 0.09, "triangle", 0.009 + this.danger * 0.018, start + 0.018, "danger");
    }
  }

  private playModeStinger(from: MusicMode, to: MusicMode): void {
    if (from === to) {
      return;
    }
    const context = this.context;
    if (!context || this.muted) {
      return;
    }
    const now = context.currentTime;
    const targetIdentity = identityForMode(to);
    if (targetIdentity === "menu") {
      this.playTone(392, 0.12, "triangle", 0.018, now + 0.01, "music");
      this.playTone(523.25, 0.16, "sine", 0.016, now + 0.06, "music");
      this.playTone(659.25, 0.22, "triangle", 0.013, now + 0.12, "music");
      return;
    }
    if (targetIdentity === "end") {
      this.playTone(196, 0.18, "triangle", 0.021, now, "danger");
      this.playTone(146.83, 0.28, "sine", 0.026, now + 0.08, "danger");
      this.playTone(98, 0.5, "sine", 0.021, now + 0.16, "danger");
      return;
    }

    if (to === "blackjack") {
      this.playTone(196, 0.13, "triangle", 0.015, now, "music");
      this.playTone(392, 0.1, "triangle", 0.016, now + 0.04, "music");
      this.playTone(466.16, 0.11, "sine", 0.014, now + 0.095, "music");
      this.playTone(587.33, 0.16, "triangle", 0.012, now + 0.15, "music");
      return;
    }
    if (to === "kiosk") {
      this.playTone(329.63, 0.1, "sine", 0.014, now + 0.01, "music");
      this.playTone(415.3, 0.13, "triangle", 0.012, now + 0.07, "music");
      this.playTone(493.88, 0.16, "sine", 0.01, now + 0.13, "music");
      return;
    }
    this.playTone(130.81, 0.14, "sine", 0.017, now, "music");
    this.playTone(196, 0.13, "triangle", 0.014, now + 0.07, "music");
    this.playTone(261.63, 0.18, "triangle", 0.012, now + 0.14, "music");
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    start: number,
    bus: "music" | "danger" = "music"
  ): void {
    const context = this.context;
    const targetBus = bus === "danger" ? this.dangerBus : this.musicBus;
    if (!context || !targetBus) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (this.danger > 0.55 && type !== "sine") {
      oscillator.detune.setValueAtTime(-this.danger * 12, start);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(targetBus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  private playNoise(duration: number, volume: number, start: number): void {
    const context = this.context;
    const musicBus = this.musicBus;
    if (!context || !musicBus) {
      return;
    }

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      const decay = 1 - i / sampleCount;
      data[i] = (this.random() * 2 - 1) * decay * decay;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(musicBus);
    source.start(start);
  }

  private getContext(): AudioContext | null {
    if (!this.context) {
      try {
        const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
        const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
        if (!Context) {
          return null;
        }
        this.context = new Context();
        this.master = this.context.createGain();
        this.musicBus = this.context.createGain();
        this.dangerBus = this.context.createGain();
        this.musicBus.connect(this.master);
        this.dangerBus.connect(this.master);
        this.master.connect(this.context.destination);
      } catch {
        return null;
      }
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    return this.context;
  }

  private applyVolume(): void {
    const context = this.context;
    const master = this.master;
    const musicBus = this.musicBus;
    const dangerBus = this.dangerBus;
    if (!context || !master || !musicBus || !dangerBus) {
      return;
    }

    const identity = identityForMode(this.mode);
    const base = identity === "menu" ? 0.4 : identity === "end" ? 0.33 : 0.42;
    const detourTrim = this.mode === "kiosk" ? 0.08 : this.mode === "blackjack" ? 0.04 : 0;
    const dangerLift = identity === "table" ? this.danger * 0.08 : 0;
    const duckFactor = 1 - this.externalDuck * 0.55;
    const target = this.muted ? MIN_AUDIBLE_GAIN : (base - detourTrim + dangerLift) * duckFactor * this.masterVolumeLevel;
    const musicTarget =
      this.muted
        ? MIN_AUDIBLE_GAIN
        : (0.9 - this.danger * 0.16 - detourTrim * 0.65) * (1 - this.externalDuck * 0.7) * this.musicVolumeMultiplier;
    const dangerBase = identity === "table" ? clamp(0.1 + this.danger * 0.88, 0.1, 0.86) : 0.09;
    const dangerTarget = this.muted ? MIN_AUDIBLE_GAIN : dangerBase * (1 - this.externalDuck * 0.2) * this.dangerVolumeMultiplier;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(Math.max(MIN_AUDIBLE_GAIN, target), context.currentTime, 0.12);
    musicBus.gain.cancelScheduledValues(context.currentTime);
    dangerBus.gain.cancelScheduledValues(context.currentTime);
    musicBus.gain.setTargetAtTime(Math.max(MIN_AUDIBLE_GAIN, musicTarget), context.currentTime, 0.1);
    dangerBus.gain.setTargetAtTime(Math.max(MIN_AUDIBLE_GAIN, dangerTarget), context.currentTime, 0.08);
  }

  private random(): number {
    this.noiseSeed = (this.noiseSeed * 1664525 + 1013904223) >>> 0;
    return this.noiseSeed / 4294967296;
  }
}

function semitone(interval: number): number {
  return 2 ** (interval / 12);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function profileForMode(mode: MusicMode): { root: number; bassPattern: number[]; chord: number[]; arrangement: number[] } {
  const identity = identityForMode(mode);
  if (identity === "menu") {
    return { root: 174.61, bassPattern: [0, 0, 3, 0, 5, 3, -2, 0], chord: [0, 3, 7], arrangement: [0.1, 0.18, 0.14, 0.22] };
  }
  if (identity === "end") {
    return { root: 155.56, bassPattern: [0, -3, 0, 2, -5, -2, -3, 0], chord: [0, 3, 8], arrangement: [0.12, 0.16, 0.2, 0.1] };
  }
  if (mode === "kiosk") {
    return { root: 164.81, bassPattern: [0, 0, 3, 0, 5, 3, -2, 0], chord: [0, 3, 10], arrangement: [0.15, 0.2, 0.17, 0.24] };
  }
  if (mode === "blackjack") {
    return { root: 164.81, bassPattern: [0, 0, 3, 0, 5, 3, -2, 0], chord: [0, 3, 10], arrangement: [0.24, 0.3, 0.26, 0.34] };
  }
  return { root: 164.81, bassPattern: [0, 0, 3, 0, 5, 3, -2, 0], chord: [0, 3, 10], arrangement: [0.2, 0.28, 0.24, 0.36] };
}

function identityForMode(mode: MusicMode): MacroIdentity {
  if (mode === "menu") {
    return "menu";
  }
  if (mode === "end") {
    return "end";
  }
  return "table";
}

function modeForPhase(phase: GamePhase): MusicMode {
  if (phase === "menu") {
    return "menu";
  }
  if (phase === "kiosk" || phase === "upgrade" || phase === "contract") {
    return "kiosk";
  }
  if (phase === "blackjack") {
    return "blackjack";
  }
  if (phase === "lost" || phase === "runWon" || phase === "tableWon") {
    return "end";
  }
  return "table";
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
