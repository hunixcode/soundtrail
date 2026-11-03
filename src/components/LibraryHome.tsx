import { useMemo, type ReactNode } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { buildHome, greeting, type Group } from '../library/home';
import { layout, space } from '../theme/tokens';
import { Artwork } from './Artwork';
import { PressableScale } from './PressableScale';
import { TrackTile } from './TrackTile';
import { Txt } from './Txt';

const CARD = 156;

type Props = {
  items: LibraryItem[];
  played: string[];
  mediaId: string | null;
  playing: boolean;
  bottom: number;
  onPlay: (items: LibraryItem[], index: number) => void;
  onLongPress: (item: LibraryItem) => void;
};

export function LibraryHome({ items, played, mediaId, playing, bottom, onPlay, onLongPress }: Props) {
  const home = useMemo(() => buildHome(items, played), [items, played]);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Txt variant="headline" accessibilityRole="header" style={styles.greeting}>
        {greeting(new Date().getHours())}
      </Txt>
      <Tracks title="Recently played" items={home.played} mediaId={mediaId} playing={playing} onPlay={onPlay} onLongPress={onLongPress} />
      <Tracks title="Recently added" items={home.recent} mediaId={mediaId} playing={playing} onPlay={onPlay} onLongPress={onLongPress} />
      <Groups title="Genres" groups={home.genres} onPlay={onPlay} />
      <Groups title="Artists" groups={home.artists} round onPlay={onPlay} />
      <Groups title="Albums" groups={home.albums} onPlay={onPlay} />
    </ScrollView>
  );
}

function Tracks({
  title,
  items,
  mediaId,
  playing,
  onPlay,
  onLongPress,
}: Omit<Props, 'played' | 'bottom'> & { title: string }) {
  if (items.length === 0) return null;
  return (
    <Shelf title={title}>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item, index }) => (
          <TrackTile
            item={item}
            size={CARD}
            active={item.id === mediaId}
            playing={playing}
            onPress={() => onPlay(items, index)}
            onLongPress={onLongPress}
          />
        )}
      />
    </Shelf>
  );
}

function Shelf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.shelf}>
      <Txt variant="headline" accessibilityRole="header" style={styles.shelfTitle}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function Groups({
  title,
  groups,
  round,
  onPlay,
}: {
  title: string;
  groups: Group[];
  round?: boolean;
  onPlay: (items: LibraryItem[], index: number) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <Shelf title={title}>
      <FlatList
        horizontal
        data={groups}
        keyExtractor={(group) => group.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item: group }) => (
          <PressableScale
            onPress={() => onPlay(group.items, 0)}
            hitSlop={0}
            accessibilityLabel={`Play ${group.title}, ${group.subtitle}`}
            style={[styles.card, round && styles.centered]}
          >
            <View style={round ? { borderRadius: CARD / 2, overflow: 'hidden' } : undefined}>
              <Artwork item={group.items[0]} size={CARD} />
            </View>
            <Txt variant="bodyStrong" numberOfLines={1}>
              {group.title}
            </Txt>
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              {group.subtitle}
            </Txt>
          </PressableScale>
        )}
      />
    </Shelf>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, paddingTop: space.xs },
  greeting: { paddingHorizontal: layout.gutter },
  shelf: { gap: space.md },
  shelfTitle: { paddingHorizontal: layout.gutter },
  row: { gap: space.lg, paddingHorizontal: layout.gutter },
  card: { width: CARD, gap: space.xs },
  centered: { alignItems: 'center' },
});
