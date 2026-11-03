import { describe, expect, it, jest } from '@jest/globals';

import { tintFor } from '../src/theme/tint';
import { palettes } from '../src/theme/tokens';

jest.mock('react-native-reanimated', () => ({ Easing: { out: () => 0, cubic: 0, bezier: () => 0 } }));

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('cover tint', () => {
  it('keeps text readable on any cover color', () => {
    for (const cover of ['#FFFFFF', '#FFFF00', '#00FFFF', '#FF0000', '#000000', '#3366CC']) {
      for (const scheme of ['dark', 'light'] as const) {
        const tint = tintFor(cover, scheme)!;
        expect(contrast(palettes[scheme].fgPrimary, tint)).toBeGreaterThan(7);
        expect(contrast(palettes[scheme].fgSecondary, tint)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('ignores anything that is not a hex color', () => {
    expect(tintFor('#ff0000', 'dark')).toBe('#380000');
    expect(tintFor(null, 'dark')).toBeNull();
    expect(tintFor('red', 'light')).toBeNull();
  });
});
