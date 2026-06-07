export const TIMBA_SFX_CUES = [
  "ball",
  "validStamp",
  "invalidStamp",
  "smallReward",
  "bigReward",
  "shopOpen",
  "shopBuy",
  "shopCancel",
  "blackjackHit",
  "blackjackStand",
  "blackjackBust",
  "blackjackCashout",
  "parcaWarning",
  "parcaCollapse",
  "win",
  "lose"
] as const;

export type TimbaSfxCue = (typeof TIMBA_SFX_CUES)[number];

export type TimbaSfxPlayOptions = {
  gain?: number;
  variation?: number;
  when?: number;
};

export type TimbaSfxOptions = {
  masterGain?: number;
  cueGains?: Partial<Record<TimbaSfxCue, number>>;
  busGains?: Partial<Record<TimbaSfxBus, number>>;
  muted?: boolean;
  random?: () => number;
};

export const TIMBA_SFX_BUSES = ["ui", "reward", "danger", "result"] as const;
export type TimbaSfxBus = (typeof TIMBA_SFX_BUSES)[number];
