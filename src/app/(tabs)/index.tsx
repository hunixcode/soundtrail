import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import type { LibraryItem } from '../../../modules/soundtrail-audio';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useIslandMetrics } from '../../components/IslandNav';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { TrackRow } from '../../components/TrackRow';
import { Txt } from '../../components/Txt';
import { filterLibrary } from '../../library/format';
import { findTracks, type OnlineTrack } from '../../online/audius';
import { pickFile, playList, rememberArtwork, scanLibrary, useApp } from '../../state/app';
import { useColors } from '../../theme/useTheme';
import { layout, radius, space, type } from '../../theme/tokens';

type Filter = 'device' | 'online';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'device', label: 'On device' },
  { id: 'online', label: 'Online' },
];

type OnlineState = { key: string; status: 'loading' | 'ready' | 'error'; items: OnlineTrack[] };

function useOnlineTracks(active: boolean, search: string, attempt: number): OnlineState {
  const key = `${search}:${attempt}`;
  const [state, setState] = useState<OnlineState>({ key: '', status: 'loading', items: [] });
  useEffect(() => {
    if (!active) return;
    let live = true;
    const timer = setTimeout(() => {
      findTracks(search)
        .then((items) => {
          if (!live) return;
          rememberArtwork(Object.fromEntries(items.map((t) => [t.uri, t.artworkUrl])));
          setState({ key, status: 'ready', items });
        })
        .catch(() => live && setState({ key, status: 'error', items: [] }));
    }, search ? 350 : 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [active, search, key]);
  return state.key === key ? state : { ...state, status: 'loading' };
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

  useEffect(() => {
    if (libraryStatus === 'idle') scanLibrary();
  }, [libraryStatus]);

  const items = useMemo(() => {
    if (online) return remote.items;
    return filterLibrary([...picked, ...library], query);
  }, [library, picked, query, online, remote.items]);

  const onPress = useCallback((item: LibraryItem) => {
    playList(items, Math.max(0, items.indexOf(item)));
  }, [items]);

  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <TrackRow item={item} active={item.id === mediaId} playing={playing} onPress={onPress} />
    ),
    [mediaId, playing, onPress],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Txt variant="title" accessibilityRole="header">
          Library
        </Txt>
        <View style={styles.headerActions}>
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
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: reserve }}
          keyboardShouldPersistTaps="handled"
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
