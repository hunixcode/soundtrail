import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { loadArtwork, useApp } from '../state/app';
import { useColors } from '../theme/useTheme';
import { radius } from '../theme/tokens';
import { Icon } from './Icon';

export function Artwork({ item, size }: { item: Pick<LibraryItem, 'uri'> | null; size: number }) {
  const colors = useColors();
  const uri = item?.uri;
  const source = useApp((s) => (uri ? s.artwork[uri] : null));

  useEffect(() => {
    if (uri) loadArtwork(uri);
  }, [uri]);

  return (
    <View
      style={[styles.frame, { width: size, height: size, backgroundColor: colors.bgSunken }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {source ? (
        <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: source }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Animated.View>
      ) : (
        <Icon name="music" size={Math.max(16, Math.round(size * 0.32))} color="fgTertiary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.artwork, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
