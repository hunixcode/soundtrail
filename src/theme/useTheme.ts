import { useColorScheme } from 'react-native';

import { useApp } from '../state/app';
import { palettes, type ColorScheme, type Palette } from './tokens';

export function useScheme(): ColorScheme {
  const system = useColorScheme();
  const preference = useApp((s) => s.prefs.theme);
  if (preference === 'dark' || preference === 'light') return preference;
  return system === 'light' ? 'light' : 'dark';
}

export function useColors(): Palette {
  return palettes[useScheme()];
}
