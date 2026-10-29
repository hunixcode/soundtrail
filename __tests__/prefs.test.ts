import { describe, expect, it } from '@jest/globals';
import { DEFAULT_PREFS, parsePrefs } from '../src/state/prefs';

describe('parsePrefs', () => {
  it('falls back to defaults for missing or broken data', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('not json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('[1,2]')).toEqual(DEFAULT_PREFS);
  });

  it('round-trips a saved state', () => {
    const saved = {
      ...DEFAULT_PREFS,
      speed: 1.25,
      eqEnabled: true,
      eqGains: [1, 2, 3],
      activePresetId: 'user:abc',
      userPresets: [{ id: 'user:abc', name: 'Mine', builtIn: false, curve: [{ hz: 60, db: 3 }] }],
      theme: 'light' as const,
      shuffle: true,
      repeat: 'one' as const,
    };
    expect(parsePrefs(JSON.stringify(saved))).toEqual(saved);
  });

  it('sanitizes out-of-range and malformed fields', () => {
    const parsed = parsePrefs(
      JSON.stringify({
        speed: 99,
        eqGains: [1, 'x', null, 2],
        theme: 'neon',
        repeat: 'sometimes',
        userPresets: [
          { id: 'a', name: '  ', curve: [{ hz: 60, db: 1 }] },
          { id: 'b', name: 'ok', curve: [{ hz: -5, db: 1 }] },
          { id: 'c', name: 'good', curve: [{ hz: 100, db: 2, extra: true }] },
        ],
      }),
    );
    expect(parsed.speed).toBe(2);
    expect(parsed.eqGains).toEqual([1, 2]);
    expect(parsed.theme).toBe('system');
    expect(parsed.repeat).toBe('off');
    expect(parsed.userPresets).toEqual([{ id: 'c', name: 'good', builtIn: false, curve: [{ hz: 100, db: 2 }] }]);
  });
});
