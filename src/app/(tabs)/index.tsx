import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import type { LibraryItem } from '../../../modules/soundtrail-audio';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useIslandMetrics } from '../../components/IslandNav';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { TrackRow } from '../../components/TrackRow';
import { TrackMenu } from '../../components/TrackMenu';
import { TrackTile } from '../../components/TrackTile';
import { Txt } from '../../components/Txt';
import { filterLibrary } from '../../library/format';
import { appendTracks, findTracks, type OnlineTrack } from '../../online/audius';
import { pickFile, playList, refreshLibrary, rememberArtwork, scanLibrary, setLibraryView, useApp } from '../../state/app';
import { useColors } from '../../theme/useTheme';
import { layout, radius, space, type } from '../../theme/tokens';

type Filter = 'device' | 'online';

const TILE_MIN = 150;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'device', label: 'On device' },
  { id: 'online', label: 'Online' },
];

type OnlineState = { key: string; status: 'loading' | 'ready' | 'error'; items: OnlineTrack[]; offset: number; done: boolean };

const keepArtwork = (tracks: OnlineTrack[]) => rememberArtwork(Object.fromEntries(tracks.map((t) => [t.uri, t.artworkUrl])));

function useOnlineTracks(active: boolean, search: string, attempt: number) {
  const key = `${search}:${attempt}`;
  const [state, setState] = useState<OnlineState>({ key: '', status: 'loading', items: [], offset: 0, done: false });
  const paging = useRef(false);

  useEffect(() => {
    if (!active) return;
    let live = true;
    const timer = setTimeout(() => {
      findTracks(search)
        .then(({ tracks, count }) => {
          if (!live) return;
          keepArtwork(tracks);
          setState({ key, status: 'ready', items: tracks, offset: count, done: count === 0 });
        })
        .catch(() => live && setState({ key, status: 'error', items: [], offset: 0, done: true }));
    }, search ? 350 : 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [active, search, key]);

  const current = state.key === key ? state : { ...state, status: 'loading' as const };

  const more = useCallback(() => {
    if (paging.current || state.key !== key || state.status !== 'ready' || state.done) return;
    paging.current = true;
    findTracks(search, state.offset)
      .then(({ tracks, count }) => {
        keepArtwork(tracks);
        setState((s) =>
          s.key === key ? { ...s, items: appendTracks(s.items, tracks), offset: s.offset + count, done: count === 0 } : s,
        );
      })
      .catch(() => undefined)
      .finally(() => {
        paging.current = false;
      });
  }, [state, key, search]);

  return { ...current, more };
}

export default function LibraryScreen() {
  const colors = useColors();
  const { reserve } = useIslandMetrics(false);
  const library = useApp((s) => s.library);
  const picked = useApp((s) => s.picked);
  const libraryStatus = useApp((s) => s.libraryStatus);
  const mediaId = useApp((s) => s.status.mediaId);
  const playing = useApp((s) => s.status.isPlaying);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('device');
  const [attempt, setAttempt] = useState(0);
  const online = filter === 'online';
  const remote = useOnlineTracks(online, query.trim(), attempt);

  useFocusEffect(
    useCallback(() => {
      refreshLibrary();
    }, []),
  );

  const items = useMemo(() => {
    if (online) return remote.items;
    return filterLibrary([...picked, ...library], query);
  }, [library, picked, query, online, remote.items]);

  const onPress = useCallback((item: LibraryItem) => {
    playList(items, Math.max(0, items.indexOf(item)));
  }, [items]);

  const [menuItem, setMenuItem] = useState<LibraryItem | null>(null);
  const closeMenu = useCallback(() => setMenuItem(null), []);
  const view = useApp((s) => s.prefs.libraryView);
  const { width } = useWindowDimensions();
  const grid = view === 'grid';
  const inner = Math.min(width, layout.maxContentWidth) - layout.gutter * 2;
  const columns = Math.max(2, Math.floor((inner + space.lg) / (TILE_MIN + space.lg)));
  const tile = Math.floor((inner - space.lg * (columns - 1)) / columns);

  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) =>
      grid ? (
        <TrackTile item={item} size={tile} active={item.id === mediaId} playing={playing} onPress={onPress} onLongPress={setMenuItem} />
      ) : (
        <TrackRow item={item} active={item.id === mediaId} playing={playing} onPress={onPress} onLongPress={setMenuItem} />
      ),
    [grid, tile, mediaId, playing, onPress],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Txt variant="title" accessibilityRole="header">
          Library
        </Txt>
        <View style={styles.headerActions}>
          <PressableScale
            onPress={() => setLibraryView(grid ? 'list' : 'grid')}
            accessibilityLabel={grid ? 'Show as list' : 'Show as grid'}
            style={styles.iconButton}
          >
            <Icon name={grid ? 'list' : 'grid'} size={22} />
          </PressableScale>
          <PressableScale onPress={pickFile} accessibilityLabel="Open an audio file" style={styles.iconButton}>
            <Icon name="folder" size={22} />
          </PressableScale>
          <PressableScale onPress={() => router.push('/settings')} accessibilityLabel="Settings" style={styles.iconButton}>
            <Icon name="settings" size={22} />
          </PressableScale>
        </View>
      </View>

      <View style={[styles.search, { backgroundColor: colors.bgSunken }]}>
        <Icon name="search" size={18} color="fgTertiary" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={online ? 'Search free music on Audius' : 'Search title, artist, album'}
          placeholderTextColor={colors.fgTertiary}
          style={[type.body, styles.input, { color: colors.fgPrimary }]}
          returnKeyType="search"
          accessibilityLabel="Search library"
        />
        {online && remote.status === 'loading' && remote.items.length > 0 ? (
          <ActivityIndicator size="small" color={colors.fgTertiary} />
        ) : null}
        {query ? (
          <PressableScale onPress={() => setQuery('')} accessibilityLabel="Clear search" style={styles.clear}>
            <Icon name="x" size={16} color="fgSecondary" />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </View>

      {online && remote.status === 'loading' && remote.items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fgSecondary} />
        </View>
      ) : online && remote.status === 'error' ? (
        <Empty
          icon="wifi-off"
          title="Could not reach Audius"
          body="Check your connection and try again."
          action="Retry"
          onAction={() => setAttempt((n) => n + 1)}
        />
      ) : !online && libraryStatus === 'loading' && library.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fgSecondary} />
        </View>
      ) : !online && libraryStatus === 'denied' ? (
        <Empty
          icon="lock"
          title="Allow access to your music"
          body="soundtrail needs permission to read audio files on this device. Nothing leaves your device."
          action="Allow access"
          onAction={() => scanLibrary()}
          secondary="Open system settings"
          onSecondary={() => Linking.openSettings()}
        />
      ) : !online && libraryStatus === 'error' ? (
        <Empty icon="alert-circle" title="Could not read your library" body="Try again in a moment." action="Retry" onAction={() => scanLibrary()} />
      ) : (
        <FlatList
          key={grid ? `grid:${columns}` : 'list'}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={grid ? columns : 1}
          columnWrapperStyle={grid ? styles.gridRow : undefined}
          contentContainerStyle={[grid && styles.grid, { paddingBottom: reserve }]}
          keyboardShouldPersistTaps="handled"
          onEndReached={online ? remote.more : undefined}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            online && remote.status === 'ready' && !remote.done && items.length > 0 ? (
              <ActivityIndicator style={styles.footer} color={colors.fgTertiary} />
            ) : undefined
          }
          initialNumToRender={14}
          windowSize={7}
          ListEmptyComponent={
            online ? (
              <Empty icon="search" title="No matches" body="Try a different search." />
            ) : libraryStatus === 'ready' ? (
              <Empty
                icon={query ? 'search' : 'music'}
                title={query ? 'No matches' : 'No files yet'}
                body={query ? 'Try a different search.' : 'Add music to this device, or open a file directly.'}
                action={query ? undefined : 'Open a file'}
                onAction={query ? undefined : pickFile}
              />
            ) : undefined
          }
        />
      )}
      <TrackMenu item={menuItem} onClose={closeMenu} />
    </Screen>
  );
}

function Empty({
  icon,
  title,
  body,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  icon: 'lock' | 'alert-circle' | 'search' | 'music' | 'wifi-off';
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={28} color="fgSecondary" />
      <Txt variant="headline" style={styles.centerText}>
        {title}
      </Txt>
      <Txt tone="secondary" style={styles.centerText}>
        {body}
      </Txt>
      {action && onAction ? (
        <PressableScale onPress={onAction} style={[styles.primary, { backgroundColor: colors.fgPrimary }]}>
          <Txt variant="bodyStrong" tone="inverse">
            {action}
          </Txt>
        </PressableScale>
      ) : null}
      {secondary && onSecondary ? (
        <PressableScale onPress={onSecondary} style={styles.secondary}>
          <Txt variant="bodyStrong" tone="secondary">
            {secondary}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  headerActions: { flexDirection: 'row', gap: space.xs },
  grid: { gap: space.xl, paddingTop: space.xs },
  gridRow: { gap: space.lg, paddingHorizontal: layout.gutter },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: {
    marginHorizontal: layout.gutter,
    height: 48,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.md,
    gap: space.sm,
  },
  input: { flex: 1, height: 48, paddingVertical: 0 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: space.sm, paddingHorizontal: layout.gutter, paddingVertical: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: space.lg },
  empty: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xxl, paddingTop: space.xxxl },
  centerText: { textAlign: 'center' },
  primary: {
    marginTop: space.sm,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { minHeight: 44, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
});
