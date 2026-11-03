import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '../components/BackHeader';
import { Chip } from '../components/Chip';
import { Empty } from '../components/Empty';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Screen, useColumns } from '../components/Screen';
import { Txt } from '../components/Txt';
import { YouTubeRow } from '../components/YouTubeRow';
import { playlistFromLink, searchMusic, type SearchFilter, type YtResult } from '../online/youtube';
import { byStatus, download, useDownloads, type DownloadStatus } from '../state/downloads';
import { useColors } from '../theme/useTheme';
import { layout, radius, space, type } from '../theme/tokens';

const FILTERS: { id: SearchFilter; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'videos', label: 'Videos' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Albums' },
];

type Search = { key: string; status: 'ready' | 'error'; items: YtResult[] };

type Tab = 'search' | 'downloads';

const STATUS_LABEL: Record<DownloadStatus, string> = { active: 'in progress', queued: 'waiting', failed: 'failed', done: 'done' };

export default function YouTubeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { columns, itemWidth } = useColumns();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('songs');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState<Search>({ key: '', status: 'ready', items: [] });
  const [tab, setTab] = useState<Tab>('search');
  const jobs = byStatus(useDownloads());
  const counts = (Object.keys(STATUS_LABEL) as DownloadStatus[])
    .map((status) => [status, jobs.filter((job) => job.status === status).length] as const)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${n} ${STATUS_LABEL[status]}`)
    .join(' · ');
  const term = query.trim();
  const link = playlistFromLink(term);
  const key = `${filter}:${term}:${attempt}`;

  useEffect(() => {
    if (!term || link) return;
    let live = true;
    const timer = setTimeout(() => {
      searchMusic(term, filter)
        .then((items) => live && setSearch({ key, status: 'ready', items }))
        .catch(() => live && setSearch({ key, status: 'error', items: [] }));
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term, filter, key, link]);

  const onPress = useCallback(
    (item: YtResult) => {
      if (item.kind === 'track') return download([item]);
      router.push({ pathname: '/playlist', params: { id: item.id, title: item.id === link ? '' : item.title } });
    },
    [link],
  );

  const loading = !!term && !link && search.key !== key;
  const items: YtResult[] = link
    ? [{ kind: 'list', id: link, title: 'Playlist from link', subtitle: 'Open to see its tracks', artworkUrl: null }]
    : term && search.key === key
      ? search.items
      : [];

  return (
    <Screen>
      <BackHeader title="YouTube" />
      <View style={styles.filters}>
        <Chip label="Search" selected={tab === 'search'} onPress={() => setTab('search')} />
        <Chip
          label={jobs.length ? `Downloads · ${jobs.length}` : 'Downloads'}
          selected={tab === 'downloads'}
          onPress={() => setTab('downloads')}
        />
      </View>
      {tab === 'downloads' ? (
        <FlatList
          data={jobs.map((job) => job.track)}
          keyExtractor={(item) => item.id}
          key={`downloads:${columns}`}
          numColumns={columns}
          renderItem={({ item }) => (
            <View style={{ width: itemWidth }}>
              <YouTubeRow item={item} onPress={onPress} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          initialNumToRender={14}
          ListHeaderComponent={
            jobs.length ? (
              <Txt tone="secondary" style={styles.summary}>
                {counts}
              </Txt>
            ) : undefined
          }
          ListEmptyComponent={
            <Empty icon="download" title="No downloads yet" body="Songs you download from Search show up here with their progress." />
          }
        />
      ) : (
      <>
      <View style={[styles.search, { backgroundColor: colors.bgSunken }]}>
        <Icon name="search" size={18} color="fgTertiary" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search YouTube Music or paste a playlist link"
          placeholderTextColor={colors.fgTertiary}
          style={[type.body, styles.input, { color: colors.fgPrimary }]}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search YouTube Music"
        />
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
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fgSecondary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}:${item.id}`}
          key={columns}
          numColumns={columns}
          renderItem={({ item }) => (
            <View style={{ width: itemWidth }}>
              <YouTubeRow item={item} onPress={onPress} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          ListEmptyComponent={
            !term ? (
              <Empty
                icon="youtube"
                title="Download from YouTube"
                body="Search songs, videos, playlists or albums, then tap a song to save it to your library."
              />
            ) : search.status === 'error' ? (
              <Empty
                icon="wifi-off"
                title="Could not reach YouTube"
                body="Check your connection and try again."
                action="Retry"
                onAction={() => setAttempt((n) => n + 1)}
              />
            ) : (
              <Empty icon="search" title="No matches" body="Try a different search or filter." />
            )
          }
        />
      )}
      </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  summary: { paddingHorizontal: layout.gutter, paddingBottom: space.md },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: layout.gutter, paddingVertical: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
