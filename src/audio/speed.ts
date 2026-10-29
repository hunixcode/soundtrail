export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2;
export const SPEED_STEP = 0.01;
export const SPEED_PRESETS = [0.75, 1, 1.25, 1.5] as const;

export function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const snapped = Math.round(value / SPEED_STEP) * SPEED_STEP;
  return Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, snapped)) * 100) / 100;
}

export function stepSpeed(value: number, steps: number): number {
  return clampSpeed(value + steps * SPEED_STEP);
}

export function formatSpeed(value: number): string {
  return `${clampSpeed(value).toFixed(2)}x`;
}

export function speedToRatio(value: number): number {
  return (clampSpeed(value) - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);
}

export function ratioToSpeed(ratio: number): number {
  return clampSpeed(MIN_SPEED + Math.min(1, Math.max(0, ratio)) * (MAX_SPEED - MIN_SPEED));
}
