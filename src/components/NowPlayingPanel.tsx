import { useCallback, useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTabTrigger } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { subtitle } from '../library/format';
import { currentItem, skipTo, useApp } from '../state/app';
import { useColors } from '../theme/useTheme';
import { space } from '../theme/tokens';
import { Artwork } from './Artwork';
import { CoverBackdrop } from './CoverBackdrop';
import { Icon } from './Icon';
import { Controls, Progress } from './PlayerControls';
import { PressableScale } from './PressableScale';
import { PANEL_WIDTH, WIDE, panel } from './Screen';
import { TrackRow } from './TrackRow';
import { Txt } from './Txt';

const ART = PANEL_WIDTH - space.xl * 2;

export function NowPlayingPanel() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trigger, switchTab } = useTabTrigger({ name: 'player' });
  const item = useApp(currentItem);
  const queue = useApp((s) => s.queue);
  const index = useApp((s) => s.status.index);
  const playing = useApp((s) => s.status.isPlaying);
  const visible = WIDE && item !== null && !(trigger?.isFocused ?? false);
  const onPress = useCallback((track: LibraryItem) => skipTo(queue.indexOf(track)), [queue]);

  useEffect(() => {
    panel.set({ open: visible });
  }, [visible]);

  useFocusEffect(
    useCallback(() => {
      panel.set({ open: visible });
      return () => panel.set({ open: false });
    }, [visible]),
  );

  if (!visible || !item) return null;

  return (
    <View style={[styles.panel, { borderLeftColor: colors.borderSubtle, paddingTop: insets.top }]}>
      <CoverBackdrop item={item} />
      <FlatList
        data={queue.slice(index + 1)}
        keyExtractor={(track, i) => `${track.id}:${i}`}
        renderItem={({ item: track }) => <TrackRow item={track} active={false} playing={playing} onPress={onPress} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        ListHeaderComponent={
          <View style={styles.now}>
            <View style={styles.header}>
              <Txt variant="label" tone="secondary">
                Now playing
              </Txt>
              <PressableScale onPress={() => switchTab('player', {})} accessibilityLabel="Open the player" style={styles.iconButton}>
                <Icon name="maximize-2" size={18} />
              </PressableScale>
            </View>
            <Artwork item={item} size={ART} />
            <View style={styles.meta}>
              <Txt variant="headline" numberOfLines={2}>
                {item.title}
              </Txt>
              <Txt tone="secondary" numberOfLines={1}>
                {subtitle(item)}
              </Txt>
            </View>
            <Progress />
            <Controls />
            {queue.length > index + 1 ? (
              <Txt variant="label" tone="secondary">
                Up next
              </Txt>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: PANEL_WIDTH, borderLeftWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  now: { paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta: { gap: 2 },
});
