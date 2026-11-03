import { useCallback, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '../theme/useTheme';
import { layout, motion } from '../theme/tokens';

export const ROW_MIN_WIDTH = 360;

export function useColumns(minWidth = ROW_MIN_WIDTH) {
  const { width } = useWindowDimensions();
  const columns = Math.max(1, Math.floor((width - layout.gutter * 2) / minWidth));
  return { columns, itemWidth: Math.floor(width / columns) };
}

export function Screen({
  children,
  style,
  onTouchStart,
  backdrop,
}: {
  children: ReactNode;
  backdrop?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onTouchStart?: ViewProps['onTouchStart'];
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.set(withTiming(1, motion.base));
      return () => opacity.set(0);
    }, [opacity]),
  );

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase, paddingTop: insets.top }]} onTouchStart={onTouchStart}>
      {backdrop}
      <Animated.View style={[styles.content, fade, style]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, width: '100%' },
});
