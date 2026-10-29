import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { useColors } from '../theme/useTheme';
import type { Palette } from '../theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({
  name,
  size = 24,
  color = 'fgPrimary',
}: {
  name: IconName;
  size?: number;
  color?: keyof Palette;
}) {
  const colors = useColors();
  return <Feather name={name} size={size} color={colors[color]} />;
}
