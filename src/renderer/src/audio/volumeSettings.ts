export const MIN_AUDIBLE_GAIN = 0.0001;
export const DEFAULT_VOLUME_LEVEL = 1;
export const MAX_VOLUME_LEVEL = 1;
export const DEFAULT_VOLUME_MULTIPLIER = 1;
export const MAX_VOLUME_MULTIPLIER = 2;

export function clampVolumeLevel(value: number): number {
  return clamp(value, 0, MAX_VOLUME_LEVEL);
}

export function clampVolumeMultiplier(value: number): number {
  return clamp(value, 0, MAX_VOLUME_MULTIPLIER);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
