import { useCallback, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '../theme/useTheme';
import { layout, motion } from '../theme/tokens';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.set(0);
      opacity.set(withTiming(1, motion.base));
    }, [opacity]),
  );

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase, paddingTop: insets.top }]}>
      <Animated.View style={[styles.content, fade, style]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: layout.maxContentWidth },
});
