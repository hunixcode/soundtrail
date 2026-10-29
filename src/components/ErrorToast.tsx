import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ERROR_MESSAGES, dismissError, useApp } from '../state/app';
import { useColors } from '../theme/useTheme';
import { layout, radius, space } from '../theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export function ErrorToast() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const error = useApp((s) => s.error);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(dismissError, 4500);
    return () => clearTimeout(timer);
  }, [error]);

  if (!error) return null;

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { top: insets.top + space.sm }]}>
      <Animated.View
        entering={FadeInUp.duration(250)}
        exiting={FadeOutUp.duration(150)}
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.fgPrimary }]}
      >
        <Icon name="alert-circle" size={18} color="fgInverse" />
        <Txt tone="inverse" style={styles.text}>
          {ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.PLAYBACK_ERROR}
        </Txt>
        <PressableScale onPress={dismissError} accessibilityLabel="Dismiss" style={styles.close}>
          <Icon name="x" size={18} color="fgInverse" />
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: layout.gutter, right: layout.gutter, alignItems: 'center' },
  toast: {
    maxWidth: 520,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    minHeight: 52,
    borderRadius: radius.card,
  },
  text: { flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
