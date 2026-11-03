import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '../components/BackHeader';
import { Empty } from '../components/Empty';
import { PressableScale } from '../components/PressableScale';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { YouTubeRow } from '../components/YouTubeRow';
import { loadList, type YtResult, type YtTrack } from '../online/youtube';
import { download } from '../state/downloads';
import { useColors } from '../theme/useTheme';
import { layout, radius, space } from '../theme/tokens';

type List = { key: string; status: 'ready' | 'error'; title: string; tracks: YtTrack[] };

export default function PlaylistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id = '', title: given = '' } = useLocalSearchParams<{ id: string; title?: string }>();
  const [attempt, setAttempt] = useState(0);
  const [list, setList] = useState<List>({ key: '', status: 'ready', title: '', tracks: [] });
  const key = `${id}:${attempt}`;

  useEffect(() => {
    let live = true;
    loadList(id)
      .then(({ title, tracks }) => live && setList({ key, status: 'ready', title, tracks }))
      .catch(() => live && setList({ key, status: 'error', title: '', tracks: [] }));
    return () => {
      live = false;
    };
  }, [id, key]);

  const name = list.title || given || 'Playlist';
  const tracks = list.key === key ? list.tracks : [];
  const onPress = useCallback((item: YtResult) => item.kind === 'track' && download([item], name), [name]);

  return (
    <Screen>
      <BackHeader title={name} />
      {list.key !== key ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fgSecondary} />
        </View>
      ) : list.status === 'error' ? (
        <Empty
          icon="wifi-off"
          title="Could not load this list"
          body="Check your connection, or the link may be private."
          action="Retry"
          onAction={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <YouTubeRow item={item} onPress={onPress} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          initialNumToRender={14}
          windowSize={7}
          ListHeaderComponent={
            tracks.length > 0 ? (
              <View style={styles.summary}>
                <Txt tone="secondary">{tracks.length === 1 ? '1 track' : `${tracks.length} tracks`}</Txt>
                <PressableScale
                  onPress={() => download(tracks, name)}
                  accessibilityLabel={`Download all ${tracks.length} tracks`}
                  style={[styles.primary, { backgroundColor: colors.fgPrimary }]}
                >
                  <Txt variant="bodyStrong" tone="inverse">
                    Download all
                  </Txt>
                </PressableScale>
              </View>
            ) : undefined
          }
          ListEmptyComponent={<Empty icon="music" title="No tracks" body="This list has no tracks that can be downloaded." />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.md,
  },
  primary: { minHeight: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
