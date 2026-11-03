import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { loadCoverColor, useApp } from '../state/app';
import { tintFor } from '../theme/tint';
import { useColors, useScheme } from '../theme/useTheme';
import { motion } from '../theme/tokens';

export function CoverBackdrop({ item }: { item: Pick<LibraryItem, 'uri'> | null }) {
  const colors = useColors();
  const scheme = useScheme();
  const cover = useApp((s) => (item ? s.artwork[item.uri] : null));
  const coverColor = useApp((s) => (cover ? s.coverColors[cover] : null));
  const color = tintFor(coverColor, scheme) ?? colors.bgBase;
  const tint = useSharedValue(color);

  useEffect(() => {
    if (cover) loadCoverColor(cover);
  }, [cover]);

  useEffect(() => {
    tint.set(withTiming(color, motion.slow));
  }, [color, tint]);

  const style = useAnimatedStyle(() => ({ backgroundColor: tint.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} />;
}
