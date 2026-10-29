import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import type { LibraryItem, MediaKind } from '../../../modules/soundtrail-audio';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useIslandMetrics } from '../../components/IslandNav';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { TrackRow } from '../../components/TrackRow';
import { Txt } from '../../components/Txt';
import { filterLibrary } from '../../library/format';
import { pickFile, playList, scanLibrary, useApp } from '../../state/app';
import { useColors } from '../../theme/useTheme';
import { layout, radius, space, type } from '../../theme/tokens';

type Filter = 'all' | MediaKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'audio', label: 'Music' },
  { id: 'video', label: 'Videos' },
];

export default function LibraryScreen() {
  const colors = useColors();
  const { reserve } = useIslandMetrics(false);
  const library = useApp((s) => s.library);
  const picked = useApp((s) => s.picked);
  const libraryStatus = useApp((s) => s.libraryStatus);
  const mediaId = useApp((s) => s.status.mediaId);
  const playing = useApp((s) => s.status.isPlaying);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (libraryStatus === 'idle') scanLibrary();
  }, [libraryStatus]);

  const items = useMemo(() => {
    const all = [...picked, ...library];
    const byKind = filter === 'all' ? all : all.filter((item) => item.kind === filter);
    return filterLibrary(byKind, query);
  }, [library, picked, filter, query]);

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
          <PressableScale onPress={pickFile} accessibilityLabel="Open a video or audio file" style={styles.iconButton}>
            <Icon name="film" size={22} />
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
          placeholder="Search title, artist, album"
          placeholderTextColor={colors.fgTertiary}
          style={[type.body, styles.input, { color: colors.fgPrimary }]}
          returnKeyType="search"
          accessibilityLabel="Search library"
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

      {libraryStatus === 'loading' && library.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fgSecondary} />
        </View>
      ) : libraryStatus === 'denied' ? (
        <Empty
          icon="lock"
          title="Allow access to your music"
          body="soundtrail needs permission to read audio and video files on this device. Nothing leaves your device."
          action="Allow access"
          onAction={() => scanLibrary()}
          secondary="Open system settings"
          onSecondary={() => Linking.openSettings()}
        />
      ) : libraryStatus === 'error' ? (
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
            libraryStatus === 'ready' ? (
              <Empty
                icon={query ? 'search' : 'music'}
                title={query ? 'No matches' : 'No files yet'}
                body={query ? 'Try a different search.' : 'Add music or videos to this device, or open a file directly.'}
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
  icon: 'lock' | 'alert-circle' | 'search' | 'music';
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
