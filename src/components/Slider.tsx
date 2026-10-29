import { memo, useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColors } from '../theme/useTheme';
import { motion } from '../theme/tokens';

type Props = {
  value: number;
  steps: number;
  onChange: (ratio: number) => void;
  onCommit?: (ratio: number) => void;
  vertical?: boolean;
  thickness?: number;
  thumbSize?: number;
  label: string;
  valueText: string;
};

const THUMB = 24;

export const Slider = memo(function Slider({
  value,
  steps,
  onChange,
  onCommit,
  vertical = false,
  thickness = 2,
  thumbSize = THUMB,
  label,
  valueText,
}: Props) {
  const colors = useColors();
  const size = useSharedValue(0);
  const progress = useSharedValue(value);
  const dragging = useSharedValue(false);
  const grip = useSharedValue(1);
  const lastStep = useSharedValue(Math.round(value * steps));

  useEffect(() => {
    if (!dragging.value) {
      progress.set(withTiming(value, motion.fast));
      lastStep.set(Math.round(value * steps));
    }
  }, [value, steps, progress, dragging, lastStep]);

  const update = (position: number) => {
    'worklet';
    if (size.value <= 0) return;
    const raw = vertical ? 1 - position / size.value : position / size.value;
    const clamped = Math.min(1, Math.max(0, raw));
    progress.set(clamped);
    const step = Math.round(clamped * steps);
    if (step !== lastStep.value) {
      lastStep.set(step);
      scheduleOnRN(onChange, step / steps);
    }
  };

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      dragging.set(true);
      grip.set(withSpring(1.15, motion.spring));
      update(vertical ? e.y : e.x);
    },
    onUpdate: (e) => {
      update(vertical ? e.y : e.x);
    },
    onFinalize: () => {
      dragging.set(false);
      grip.set(withSpring(1, motion.spring));
      const snapped = lastStep.value / steps;
      progress.set(withSpring(snapped, motion.spring));
      if (onCommit) scheduleOnRN(onCommit, snapped);
    },
  });

  const onLayout = (e: LayoutChangeEvent) => {
    size.set(vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width);
  };

  const fill = useAnimatedStyle(() => {
    const hidden = (1 - progress.value) * size.value;
    return vertical ? { transform: [{ translateY: hidden }] } : { transform: [{ translateX: -hidden }] };
  });
  const thumb = useAnimatedStyle(() => {
    const offset = progress.value * size.value - thumbSize / 2;
    const scale = grip.value;
    return vertical
      ? { transform: [{ translateY: -offset }, { scale }] }
      : { transform: [{ translateX: offset }, { scale }] };
  });

  const step = (direction: number) => {
    const next = Math.min(steps, Math.max(0, Math.round(value * steps) + direction));
    onChange(next / steps);
    onCommit?.(next / steps);
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={vertical ? styles.hitVertical : styles.hitHorizontal}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: valueText }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <View
          onLayout={onLayout}
          style={[
            vertical ? styles.trackVertical : styles.trackHorizontal,
            vertical ? { width: thickness } : { height: thickness },
            { backgroundColor: colors.bgSunken, borderRadius: thickness },
          ]}
        >
          <Animated.View
            style={[
              vertical ? styles.fillVertical : styles.fillHorizontal,
              { backgroundColor: colors.fgPrimary, borderRadius: thickness },
              fill,
            ]}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            vertical ? styles.thumbVertical : styles.thumbHorizontal,
            { backgroundColor: colors.fgPrimary },
            thumbSize !== THUMB && { width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2, top: vertical ? undefined : (48 - thumbSize) / 2 },
            thumb,
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  hitHorizontal: { height: 48, justifyContent: 'center' },
  hitVertical: { flex: 1, width: 48, alignItems: 'center' },
  trackHorizontal: { width: '100%', overflow: 'hidden' },
  trackVertical: { flex: 1, overflow: 'hidden', justifyContent: 'flex-end' },
  fillHorizontal: { height: '100%', width: '100%' },
  fillVertical: { width: '100%', height: '100%' },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
  thumbHorizontal: { left: 0, top: (48 - THUMB) / 2 },
  thumbVertical: { bottom: 0 },
});
