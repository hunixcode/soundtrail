import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  style,
  onPressIn,
  onPressOut,
  hitSlop = 8,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      hitSlop={hitSlop}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      onPressIn={(e) => {
        scale.set(withTiming(0.96, motion.fast));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, motion.fast));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
