import { Easing } from 'react-native-reanimated';

export const palettes = {
  dark: {
    bgBase: '#000000',
    bgRaised: '#111111',
    bgSunken: '#1A1A1A',
    borderSubtle: '#262626',
    fgPrimary: '#FFFFFF',
    fgSecondary: '#A3A3A3',
    fgTertiary: '#6B6B6B',
    fgInverse: '#000000',
  },
  light: {
    bgBase: '#FFFFFF',
    bgRaised: '#F5F5F5',
    bgSunken: '#EBEBEB',
    borderSubtle: '#E0E0E0',
    fgPrimary: '#000000',
    fgSecondary: '#595959',
    fgTertiary: '#8C8C8C',
    fgInverse: '#FFFFFF',
  },
} as const;

export type Palette = { [K in keyof typeof palettes.dark]: string };
export type ColorScheme = keyof typeof palettes;

export const fonts = {
  regular: 'Archivo_400Regular',
  semibold: 'Archivo_600SemiBold',
  extrabold: 'Archivo_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 },
  headline: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16 },
  monoDisplay: { fontFamily: fonts.mono, fontSize: 64, lineHeight: 72, letterSpacing: -2 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { artwork: 8, card: 12, pill: 999 } as const;

export const layout = {
  gutter: 16,
  navHeight: 64,
  navGap: 16,
  miniHeight: 64,
  miniGap: 8,
  maxContentWidth: 560,
} as const;

export const motion = {
  fast: { duration: 150, easing: Easing.out(Easing.cubic) },
  base: { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) },
  slow: { duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  spring: { duration: 420, dampingRatio: 1, overshootClamping: true },
} as const;
