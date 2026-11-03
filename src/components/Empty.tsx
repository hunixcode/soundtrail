import { StyleSheet, View } from 'react-native';

import { useColors } from '../theme/useTheme';
import { radius, space } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export function Empty({
  icon,
  title,
  body,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={28} color="fgSecondary" />
      <Txt variant="headline" style={styles.centerText}>
        {title}
      </Txt>
      <Txt tone="secondary" style={styles.centerText}>
        {body}
      </Txt>
      {action && onAction ? (
        <PressableScale onPress={onAction} style={[styles.primary, { backgroundColor: colors.fgPrimary }]}>
          <Txt variant="bodyStrong" tone="inverse">
            {action}
          </Txt>
        </PressableScale>
      ) : null}
      {secondary && onSecondary ? (
        <PressableScale onPress={onSecondary} style={styles.secondary}>
          <Txt variant="bodyStrong" tone="secondary">
            {secondary}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xxl, paddingTop: space.xxxl },
  centerText: { textAlign: 'center' },
  primary: {
    marginTop: space.sm,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { minHeight: 44, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
});
