import { describe, expect, it } from '@jest/globals';
import { BUILT_IN_PRESETS, clampGain, curveAt, curveFromBands, formatHz, gainsForBands } from '../src/audio/presets';

const band = (index: number, centerHz: number) => ({ index, centerHz, minDb: -15, maxDb: 15, gainDb: 0 });
const fiveBands = [band(0, 60), band(1, 230), band(2, 910), band(3, 3600), band(4, 14000)];
const tenBands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((hz, i) => band(i, hz));

describe('presets', () => {
  it('interpolates the curve in log frequency', () => {
    const points = [
      { hz: 100, db: 0 },
      { hz: 10000, db: 10 },
    ];
    expect(curveAt(points, 1000)).toBeCloseTo(5);
    expect(curveAt(points, 10)).toBe(0);
    expect(curveAt(points, 20000)).toBe(10);
    expect(curveAt([], 500)).toBe(0);
  });

  it('maps a preset onto any band count', () => {
    const bass = BUILT_IN_PRESETS.find((p) => p.id === 'bass')!;
    expect(gainsForBands(bass.curve, fiveBands)).toEqual([6, 4, 0, 0, 0]);
    const ten = gainsForBands(bass.curve, tenBands);
    expect(ten).toHaveLength(10);
    expect(ten[0]).toBe(6);
    expect(ten[9]).toBe(0);
  });

  it('round-trips a user curve through a different band layout', () => {
    const curve = curveFromBands(fiveBands, [3, 2, 1, 0, -1]);
    expect(gainsForBands(curve, fiveBands)).toEqual([3, 2, 1, 0, -1]);
  });

  it('clamps gains to the device range', () => {
    expect(clampGain({ minDb: -12, maxDb: 12 }, 40)).toBe(12);
    expect(clampGain({ minDb: -12, maxDb: 12 }, Number.NaN)).toBe(0);
  });

  it('formats band frequencies', () => {
    expect(formatHz(60)).toBe('60');
    expect(formatHz(910)).toBe('910');
    expect(formatHz(3600)).toBe('3.6k');
    expect(formatHz(14000)).toBe('14k');
  });
});
