import { describe, expect, it } from '@jest/globals';
import { clampSpeed, formatSpeed, ratioToSpeed, speedToRatio, stepSpeed } from '../src/audio/speed';

describe('speed', () => {
  it('clamps to 0.5x - 2.0x and snaps to 0.01 steps', () => {
    expect(clampSpeed(0.1)).toBe(0.5);
    expect(clampSpeed(3)).toBe(2);
    expect(clampSpeed(1.234)).toBe(1.23);
    expect(clampSpeed(1.236)).toBe(1.24);
    expect(clampSpeed(Number.NaN)).toBe(1);
  });

  it('steps without floating point drift', () => {
    let value = 1;
    for (let i = 0; i < 7; i++) value = stepSpeed(value, 1);
    expect(value).toBe(1.07);
    expect(stepSpeed(2, 1)).toBe(2);
    expect(stepSpeed(0.5, -1)).toBe(0.5);
  });

  it('formats with two decimals', () => {
    expect(formatSpeed(1)).toBe('1.00x');
    expect(formatSpeed(0.75)).toBe('0.75x');
  });

  it('round-trips between ratio and speed', () => {
    expect(speedToRatio(0.5)).toBe(0);
    expect(speedToRatio(2)).toBe(1);
    expect(ratioToSpeed(speedToRatio(1.37))).toBe(1.37);
    expect(ratioToSpeed(-1)).toBe(0.5);
  });
});
