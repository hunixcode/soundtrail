import { Text, type TextProps } from 'react-native';

import { useColors } from '../theme/useTheme';
import { type } from '../theme/tokens';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse';

const toneKey = {
  primary: 'fgPrimary',
  secondary: 'fgSecondary',
  tertiary: 'fgTertiary',
  inverse: 'fgInverse',
} as const;

export function Txt({
  variant = 'body',
  tone = 'primary',
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const colors = useColors();
  return <Text {...props} style={[type[variant], { color: colors[toneKey[tone]] }, style]} />;
}
