import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { formatTime, subtitle } from '../library/format';
import { useColors } from '../theme/useTheme';
import { layout, space } from '../theme/tokens';
import { Artwork } from './Artwork';
import { Icon } from './Icon';
import { Txt } from './Txt';

type Props = {
  item: LibraryItem;
  active: boolean;
  playing: boolean;
  onPress: (item: LibraryItem) => void;
  onLongPress?: (item: LibraryItem) => void;
};

export const TrackRow = memo(function TrackRow({ item, active, playing, onPress, onLongPress }: Props) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      android_ripple={{ color: colors.bgSunken }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${subtitle(item)}`}
      accessibilityState={{ selected: active }}
      style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
    >
      <Artwork item={item} size={48} />
      <View style={styles.text}>
        <Txt variant={active ? 'bodyStrong' : 'body'} numberOfLines={1}>
          {item.title}
        </Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {subtitle(item)}
        </Txt>
      </View>
      {active ? (
        <Icon name={playing ? 'volume-2' : 'pause'} size={18} />
      ) : (
        <Txt variant="mono" tone="tertiary">
          {formatTime(item.durationMs)}
        </Txt>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: layout.gutter,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
});
