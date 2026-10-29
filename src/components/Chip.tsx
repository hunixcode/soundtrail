import { StyleSheet } from 'react-native';

import { useColors } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  accessibilityHint,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
}) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.fgPrimary, borderColor: colors.fgPrimary }
          : { borderColor: colors.borderSubtle },
      ]}
    >
      <Txt variant="bodyStrong" tone={selected ? 'inverse' : 'secondary'} style={styles.text}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 14 },
});
