import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useColors } from '../theme/useTheme';
import { motion } from '../theme/tokens';

const WIDTH = 52;
const HEIGHT = 32;
const KNOB = 24;

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  const colors = useColors();
  const position = useSharedValue(value ? 1 : 0);
  const tint = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    position.set(withSpring(value ? 1 : 0, motion.spring));
    tint.set(withTiming(value ? 1 : 0, motion.fast));
  }, [value, position, tint]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(tint.value, [0, 1], [colors.bgSunken, colors.fgPrimary]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * (WIDTH - KNOB - 8) }],
    backgroundColor: interpolateColor(tint.value, [0, 1], [colors.fgSecondary, colors.fgInverse]),
  }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: 4, justifyContent: 'center' },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
});
