import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { subtitle } from '../library/format';
import { useColors } from '../theme/useTheme';
import { space } from '../theme/tokens';
import { Artwork } from './Artwork';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

type Props = {
  item: LibraryItem;
  size: number;
  active: boolean;
  playing: boolean;
  onPress: (item: LibraryItem) => void;
  onLongPress?: (item: LibraryItem) => void;
};

export const TrackTile = memo(function TrackTile({ item, size, active, playing, onPress, onLongPress }: Props) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      hitSlop={0}
      accessibilityLabel={`${item.title}, ${subtitle(item)}`}
      accessibilityState={{ selected: active }}
      style={[styles.tile, { width: size }]}
    >
      <View>
        <Artwork item={item} size={size} />
        {active ? (
          <View style={[styles.badge, { backgroundColor: colors.fgPrimary }]}>
            <Icon name={playing ? 'volume-2' : 'pause'} size={14} color="fgInverse" />
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <Txt variant={active ? 'bodyStrong' : 'body'} numberOfLines={1}>
          {item.title}
        </Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {subtitle(item)}
        </Txt>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  tile: { gap: space.sm },
  badge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { gap: 2 },
});
