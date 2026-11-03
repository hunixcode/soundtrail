import type { ColorScheme } from './tokens';

const MIX: Record<ColorScheme, { amount: number; base: number }> = {
  dark: { amount: 0.22, base: 0 },
  light: { amount: 0.18, base: 255 },
};

export function tintFor(hex: string | null | undefined, scheme: ColorScheme): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const { amount, base } = MIX[scheme];
  return `#${[value >> 16, value >> 8, value]
    .map((channel) => Math.round((channel & 255) * amount + base * (1 - amount)).toString(16).padStart(2, '0'))
    .join('')}`;
}
