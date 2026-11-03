import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { useColors } from '../theme/useTheme';
import { Artwork } from './Artwork';

const GROOVES = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52];
const LABEL = 0.36;
const TURN_MS = 3600;

export function Vinyl({
  item,
  size,
  spinning,
  labelRatio = LABEL,
}: {
  item: Pick<LibraryItem, 'uri'>;
  size: number;
  spinning: boolean;
  labelRatio?: number;
}) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const angle = useSharedValue(0);

  useEffect(() => {
    if (spinning && !reduced) {
      angle.set(withRepeat(withTiming(angle.get() + 360, { duration: TURN_MS, easing: Easing.linear }), -1));
    } else {
      cancelAnimation(angle);
    }
  }, [spinning, reduced, angle]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  const label = Math.round(size * labelRatio);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.vinyl }, spin]}
    >
      {GROOVES.map((ratio) => (
        <View
          key={ratio}
          style={[
            styles.groove,
            { width: size * ratio, height: size * ratio, borderRadius: (size * ratio) / 2, borderColor: colors.groove },
          ]}
        />
      ))}
      <View style={{ width: label, height: label, borderRadius: label / 2, overflow: 'hidden' }}>
        <Artwork item={item} size={label} />
      </View>
      <View style={[styles.hole, { width: size * 0.035, height: size * 0.035, borderRadius: size, backgroundColor: colors.vinyl }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
  groove: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth * 2 },
  hole: { position: 'absolute' },
});
