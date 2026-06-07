import type { TimbaSfxBus, TimbaSfxCue, TimbaSfxOptions, TimbaSfxPlayOptions } from "./audioTypes.js";
import {
  DEFAULT_VOLUME_LEVEL,
  DEFAULT_VOLUME_MULTIPLIER,
  MIN_AUDIBLE_GAIN,
  clampVolumeLevel,
  clampVolumeMultiplier
} from "./volumeSettings.js";

const DEFAULT_MASTER_GAIN = 0.68;
const DEFAULT_BUS_GAINS: Record<TimbaSfxBus, number> = {
  ui: 0.54,
  reward: 0.76,
  danger: 0.78,
  result: 0.88
};

type ToneShape = {
  frequency: number;
  duration: number;
  volume: number;
  type: OscillatorType;
  delay?: number;
  glideTo?: number;
  attack?: number;
  detune?: number;
  lowpassHz?: number;
  variationHz?: number;
};

type NoiseShape = {
  duration: number;
  volume: number;
  delay?: number;
  highpassHz?: number;
  lowpassHz?: number;
};

export class TimbaSfx {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Map<TimbaSfxBus, GainNode> = new Map();
  private muted = false;
  private masterGain = DEFAULT_MASTER_GAIN;
  private cueGains = new Map<TimbaSfxCue, number>();
  private busGains = new Map<TimbaSfxBus, number>();
  private cueVolumeMultipliers = new Map<TimbaSfxCue, number>();
  private busVolumeMultipliers = new Map<TimbaSfxBus, number>();
  private masterVolumeLevel = DEFAULT_VOLUME_LEVEL;
  private readonly random: () => number;
  private activeNodes = new Set<AudioNode>();

  constructor(options: TimbaSfxOptions = {}) {
    this.muted = options.muted ?? false;
    this.masterGain = options.masterGain ?? DEFAULT_MASTER_GAIN;
    this.random = options.random ?? Math.random;
    if (options.cueGains) {
      for (const [cue, gain] of Object.entries(options.cueGains) as Array<[TimbaSfxCue, number | undefined]>) {
        if (typeof gain === "number" && Number.isFinite(gain)) {
          this.cueGains.set(cue, Math.max(0, gain));
        }
      }
    }
    for (const [bus, gain] of Object.entries(DEFAULT_BUS_GAINS) as Array<[TimbaSfxBus, number]>) {
      this.busGains.set(bus, gain);
      this.busVolumeMultipliers.set(bus, DEFAULT_VOLUME_MULTIPLIER);
    }
    if (options.busGains) {
      for (const [bus, gain] of Object.entries(options.busGains) as Array<[TimbaSfxBus, number | undefined]>) {
        if (typeof gain === "number" && Number.isFinite(gain)) {
          this.busGains.set(bus, Math.max(0, gain));
        }
      }
    }
  }

  play(cue: TimbaSfxCue, options: TimbaSfxPlayOptions = {}): void {
    const context = this.getContext();
    const master = this.master;
    if (!context || !master || this.muted) {
      return;
    }

    const variation = clamp(options.variation ?? this.randRange(-1, 1), -1, 1);
    const cueGain = this.cueGains.get(cue) ?? 1;
    const cueMultiplier = this.getCueVolumeMultiplier(cue);
    const gain = Math.max(0, (options.gain ?? 1) * cueGain * cueMultiplier);
    const start = options.when ?? context.currentTime;
    const profile = this.profileFor(cue);
    const bus = this.getBus(profile.bus);
    if (!bus) {
      return;
    }

    for (const tone of profile.tones) {
      this.playTone(context, bus, tone, variation, gain, start);
    }
    for (const noise of profile.noises) {
      this.playNoise(context, bus, noise, gain, start);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMasterGain(gain: number): void {
    this.masterGain = Math.max(0, gain);
    this.applyMasterGain();
  }

  setMasterVolumeLevel(level: number): void {
    this.masterVolumeLevel = clampVolumeLevel(level);
    this.applyMasterGain();
  }

  getMasterVolumeLevel(): number {
    return this.masterVolumeLevel;
  }

  setCueGain(cue: TimbaSfxCue, gain: number): void {
    this.cueGains.set(cue, Math.max(0, gain));
  }

  setCueVolumeMultiplier(cue: TimbaSfxCue, multiplier: number): void {
    this.cueVolumeMultipliers.set(cue, clampVolumeMultiplier(multiplier));
  }

  getCueVolumeMultiplier(cue: TimbaSfxCue): number {
    return this.cueVolumeMultipliers.get(cue) ?? DEFAULT_VOLUME_MULTIPLIER;
  }

  setBusGain(bus: TimbaSfxBus, gain: number): void {
    this.busGains.set(bus, Math.max(0, gain));
    this.applyMasterGain();
  }

  setBusVolumeMultiplier(bus: TimbaSfxBus, multiplier: number): void {
    this.busVolumeMultipliers.set(bus, clampVolumeMultiplier(multiplier));
    this.applyMasterGain();
  }

  getBusVolumeMultiplier(bus: TimbaSfxBus): number {
    return this.busVolumeMultipliers.get(bus) ?? DEFAULT_VOLUME_MULTIPLIER;
  }

  playBall(): void {
    this.play("ball");
  }

  playStamp(valid = true): void {
    this.play(valid ? "validStamp" : "invalidStamp");
  }

  playReward(big = false): void {
    this.play(big ? "bigReward" : "smallReward");
  }

  playShop(kind: "open" | "buy" | "cancel" = "open"): void {
    this.play(kind === "buy" ? "shopBuy" : kind === "cancel" ? "shopCancel" : "shopOpen");
  }

  playBlackjack(action: "hit" | "stand" | "bust" | "cashout"): void {
    const cue: Record<typeof action, TimbaSfxCue> = {
      hit: "blackjackHit",
      stand: "blackjackStand",
      bust: "blackjackBust",
      cashout: "blackjackCashout"
    };
    this.play(cue[action]);
  }

  playParca(kind: "warning" | "collapse"): void {
    this.play(kind === "collapse" ? "parcaCollapse" : "parcaWarning");
  }

  playWin(): void {
    this.play("win");
  }

  playLose(): void {
    this.play("lose");
  }

  stopAll(): void {
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect failures during cleanup.
      }
    }
    this.activeNodes.clear();
  }

  destroy(): void {
    this.stopAll();
    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
    this.buses.clear();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
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
        for (const bus of Object.keys(DEFAULT_BUS_GAINS) as TimbaSfxBus[]) {
          const gain = this.context.createGain();
          this.buses.set(bus, gain);
          gain.connect(this.master);
        }
        this.master.connect(this.context.destination);
        this.applyMasterGain();
      } catch {
        return null;
      }
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    return this.context;
  }

  private applyMasterGain(): void {
    if (!this.context || !this.master) {
      return;
    }
    const target = this.muted ? MIN_AUDIBLE_GAIN : Math.max(MIN_AUDIBLE_GAIN, this.masterGain * this.masterVolumeLevel);
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.04);
    for (const [bus, node] of this.buses) {
      const busBase = this.busGains.get(bus) ?? 1;
      const busMultiplier = this.getBusVolumeMultiplier(bus);
      const busTarget = this.muted ? MIN_AUDIBLE_GAIN : Math.max(MIN_AUDIBLE_GAIN, busBase * busMultiplier);
      node.gain.cancelScheduledValues(this.context.currentTime);
      node.gain.setTargetAtTime(busTarget, this.context.currentTime, 0.035);
    }
  }

  private profileFor(cue: TimbaSfxCue): { bus: TimbaSfxBus; tones: ToneShape[]; noises: NoiseShape[] } {
    switch (cue) {
      case "ball":
        return {
          bus: "ui",
          tones: [
            { frequency: 188, duration: 0.045, volume: 0.034, type: "triangle", attack: 0.006 },
            { frequency: 340, duration: 0.075, volume: 0.021, type: "sine", delay: 0.028 }
          ],
          noises: []
        };
      case "validStamp":
        return {
          bus: "ui",
          tones: [
            { frequency: 132, duration: 0.052, volume: 0.031, type: "triangle", attack: 0.005 },
            { frequency: 82, duration: 0.09, volume: 0.019, type: "sine", delay: 0.018 }
          ],
          noises: [{ duration: 0.02, volume: 0.006, highpassHz: 260, lowpassHz: 1500 }]
        };
      case "invalidStamp":
        return {
          bus: "ui",
          tones: [
            { frequency: 180, duration: 0.08, volume: 0.023, type: "triangle", glideTo: 118, attack: 0.01 },
            { frequency: 96, duration: 0.11, volume: 0.017, type: "sine", delay: 0.035, glideTo: 78 }
          ],
          noises: []
        };
      case "smallReward":
        return {
          bus: "reward",
          tones: [
            { frequency: 392, duration: 0.06, volume: 0.025, type: "triangle", attack: 0.008 },
            { frequency: 523, duration: 0.08, volume: 0.023, type: "sine", delay: 0.05 },
            { frequency: 659, duration: 0.12, volume: 0.018, type: "triangle", delay: 0.105 }
          ],
          noises: []
        };
      case "bigReward":
        return {
          bus: "reward",
          tones: [
            { frequency: 392, duration: 0.075, volume: 0.027, type: "triangle", attack: 0.008 },
            { frequency: 494, duration: 0.095, volume: 0.026, type: "sine", delay: 0.045 },
            { frequency: 659, duration: 0.13, volume: 0.023, type: "triangle", delay: 0.1 },
            { frequency: 784, duration: 0.19, volume: 0.018, type: "sine", delay: 0.165 }
          ],
          noises: [{ duration: 0.055, volume: 0.006, delay: 0.035, highpassHz: 1200, lowpassHz: 3600 }]
        };
      case "shopOpen":
        return {
          bus: "ui",
          tones: [
            { frequency: 330, duration: 0.05, volume: 0.021, type: "triangle" },
            { frequency: 260, duration: 0.07, volume: 0.017, type: "sine", delay: 0.045 }
          ],
          noises: []
        };
      case "shopBuy":
        return {
          bus: "reward",
          tones: [
            { frequency: 294, duration: 0.05, volume: 0.022, type: "triangle" },
            { frequency: 392, duration: 0.07, volume: 0.021, type: "triangle", delay: 0.04 },
            { frequency: 494, duration: 0.09, volume: 0.018, type: "sine", delay: 0.095 }
          ],
          noises: [{ duration: 0.025, volume: 0.004, delay: 0.035, highpassHz: 700, lowpassHz: 2600 }]
        };
      case "shopCancel":
        return {
          bus: "ui",
          tones: [
            { frequency: 260, duration: 0.07, volume: 0.019, type: "triangle", glideTo: 220 },
            { frequency: 174, duration: 0.09, volume: 0.015, type: "sine", delay: 0.035 }
          ],
          noises: []
        };
      case "blackjackHit":
        return {
          bus: "ui",
          tones: [
            { frequency: 174, duration: 0.035, volume: 0.02, type: "triangle", attack: 0.004 },
            { frequency: 260, duration: 0.055, volume: 0.016, type: "sine", delay: 0.026 }
          ],
          noises: [{ duration: 0.028, volume: 0.0055, delay: 0.006, highpassHz: 520, lowpassHz: 2200 }]
        };
      case "blackjackStand":
        return {
          bus: "ui",
          tones: [
            { frequency: 246, duration: 0.08, volume: 0.021, type: "triangle", glideTo: 220 },
            { frequency: 164, duration: 0.1, volume: 0.017, type: "sine", delay: 0.07 }
          ],
          noises: []
        };
      case "blackjackBust":
        return {
          bus: "danger",
          tones: [
            { frequency: 196, duration: 0.1, volume: 0.023, type: "triangle", glideTo: 130, attack: 0.012 },
            { frequency: 98, duration: 0.22, volume: 0.021, type: "sine", delay: 0.055, glideTo: 65 },
            { frequency: 49, duration: 0.26, volume: 0.014, type: "sine", delay: 0.11 }
          ],
          noises: [{ duration: 0.065, volume: 0.006, delay: 0.035, highpassHz: 260, lowpassHz: 1200 }]
        };
      case "blackjackCashout":
        return {
          bus: "reward",
          tones: [
            { frequency: 330, duration: 0.06, volume: 0.023, type: "triangle" },
            { frequency: 440, duration: 0.08, volume: 0.022, type: "sine", delay: 0.045 },
            { frequency: 554, duration: 0.1, volume: 0.019, type: "triangle", delay: 0.095 },
            { frequency: 659, duration: 0.14, volume: 0.016, type: "sine", delay: 0.15 }
          ],
          noises: [{ duration: 0.04, volume: 0.0045, delay: 0.03, highpassHz: 900, lowpassHz: 3200 }]
        };
      case "parcaWarning":
        return {
          bus: "danger",
          tones: [
            { frequency: 86, duration: 0.2, volume: 0.023, type: "triangle", glideTo: 76, attack: 0.018 },
            { frequency: 48, duration: 0.28, volume: 0.02, type: "sine", delay: 0.045, glideTo: 43 },
            { frequency: 123, duration: 0.12, volume: 0.012, type: "triangle", delay: 0.13, glideTo: 104 }
          ],
          noises: [{ duration: 0.075, volume: 0.0065, highpassHz: 180, lowpassHz: 1000 }]
        };
      case "parcaCollapse":
        return {
          bus: "danger",
          tones: [
            { frequency: 116, duration: 0.24, volume: 0.026, type: "sawtooth", glideTo: 54, lowpassHz: 620 },
            { frequency: 73, duration: 0.38, volume: 0.024, type: "triangle", delay: 0.065, glideTo: 39 },
            { frequency: 39, duration: 0.32, volume: 0.017, type: "sine", delay: 0.12, glideTo: 32 }
          ],
          noises: [{ duration: 0.16, volume: 0.008, highpassHz: 120, lowpassHz: 850 }]
        };
      case "win":
        return {
          bus: "result",
          tones: [
            { frequency: 392, duration: 0.1, volume: 0.027, type: "triangle" },
            { frequency: 523, duration: 0.12, volume: 0.028, type: "sine", delay: 0.085 },
            { frequency: 659, duration: 0.14, volume: 0.025, type: "triangle", delay: 0.17 },
            { frequency: 880, duration: 0.23, volume: 0.017, type: "sine", delay: 0.235 }
          ],
          noises: [{ duration: 0.065, volume: 0.005, delay: 0.085, highpassHz: 1100, lowpassHz: 3400 }]
        };
      case "lose":
        return {
          bus: "result",
          tones: [
            { frequency: 164, duration: 0.18, volume: 0.026, type: "triangle", glideTo: 118 },
            { frequency: 98, duration: 0.31, volume: 0.023, type: "sine", delay: 0.09, glideTo: 62 },
            { frequency: 62, duration: 0.28, volume: 0.015, type: "sine", delay: 0.17, glideTo: 49 }
          ],
          noises: [{ duration: 0.08, volume: 0.006, delay: 0.05, highpassHz: 240, lowpassHz: 1100 }]
        };
      default:
        return { bus: "ui", tones: [], noises: [] };
    }
  }

  private playTone(
    context: AudioContext,
    bus: GainNode,
    tone: ToneShape,
    variation: number,
    gainScale: number,
    rootStart: number
  ): void {
    const start = rootStart + (tone.delay ?? 0);
    const detune = variation * (tone.detune ?? 8);
    const frequencyDrift = tone.variationHz ?? 5;
    const attack = tone.attack ?? (tone.type === "sine" ? 0.016 : 0.018);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneFilter = this.createToneFilter(context, tone, start);
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(Math.max(20, tone.frequency + variation * frequencyDrift), start);
    oscillator.detune.setValueAtTime(detune, start);
    if (tone.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, tone.glideTo + variation * frequencyDrift * 0.65), start + tone.duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, tone.volume * gainScale), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    if (toneFilter) {
      oscillator.connect(toneFilter);
      toneFilter.connect(gain);
      this.trackNode(toneFilter);
    } else {
      oscillator.connect(gain);
    }
    gain.connect(bus);
    this.trackNode(oscillator);
    this.trackNode(gain);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.035);
    oscillator.onended = () => {
      this.untrackNode(oscillator);
      try {
        if (toneFilter) {
          toneFilter.disconnect();
        }
        gain.disconnect();
      } catch {
        // Ignore cleanup race.
      }
      if (toneFilter) {
        this.untrackNode(toneFilter);
      }
      this.untrackNode(gain);
    };
  }

  private playNoise(context: AudioContext, bus: GainNode, noise: NoiseShape, gainScale: number, rootStart: number): void {
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * noise.duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      const decay = 1 - i / sampleCount;
      data[i] = (this.random() * 2 - 1) * decay * decay;
    }

    const start = rootStart + (noise.delay ?? 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(noise.highpassHz ?? 800, start);
    highpass.Q.setValueAtTime(0.6, start);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(noise.lowpassHz ?? 4200, start);
    lowpass.Q.setValueAtTime(0.45, start);
    gain.gain.setValueAtTime(Math.max(0.0001, noise.volume * gainScale), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + noise.duration);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(bus);
    this.trackNode(source);
    this.trackNode(highpass);
    this.trackNode(lowpass);
    this.trackNode(gain);
    source.start(start);
    source.stop(start + noise.duration + 0.02);
    source.onended = () => {
      this.untrackNode(source);
      try {
        highpass.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup race.
      }
      this.untrackNode(highpass);
      this.untrackNode(lowpass);
      this.untrackNode(gain);
    };
  }

  private createToneFilter(context: AudioContext, tone: ToneShape, start: number): BiquadFilterNode | null {
    const lowpassHz = tone.lowpassHz ?? (tone.type === "square" ? 1600 : tone.type === "sawtooth" ? 1200 : null);
    if (!lowpassHz) {
      return null;
    }
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(lowpassHz, start);
    filter.Q.setValueAtTime(0.45, start);
    return filter;
  }

  private trackNode(node: AudioNode): void {
    this.activeNodes.add(node);
  }

  private untrackNode(node: AudioNode): void {
    this.activeNodes.delete(node);
  }

  private randRange(min: number, max: number): number {
    return min + (max - min) * this.random();
  }

  private getBus(bus: TimbaSfxBus): GainNode | null {
    return this.buses.get(bus) ?? null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
