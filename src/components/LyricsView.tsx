import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { activeLine, fetchLyrics, type LyricLine, type Lyrics } from '../online/lyrics';
import { seekTo, useApp } from '../state/app';
import { useColors } from '../theme/useTheme';
import { space, type } from '../theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

type Load = { key: string } & ({ status: 'loading' } | { status: 'error' } | { status: 'ready'; lyrics: Lyrics });

export function LyricsView({ item }: { item: LibraryItem }) {
  const [attempt, setAttempt] = useState(0);
  const key = `${item.id}:${attempt}`;
  const [result, setResult] = useState<Load>({ key: '', status: 'loading' });
  const load: Load = result.key === key ? result : { key, status: 'loading' };

  useEffect(() => {
    let live = true;
    fetchLyrics(item)
      .then((lyrics) => live && setResult({ key, status: 'ready', lyrics }))
      .catch(() => live && setResult({ key, status: 'error' }));
    return () => {
      live = false;
    };
  }, [item, key]);

  if (load.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (load.status === 'error') {
    return (
      <View style={styles.center}>
        <Icon name="cloud-off" size={24} color="fgSecondary" />
        <Txt tone="secondary">Lyrics are unavailable right now.</Txt>
        <PressableScale onPress={() => setAttempt((n) => n + 1)} style={styles.retry}>
          <Txt variant="bodyStrong">Retry</Txt>
        </PressableScale>
      </View>
    );
  }
  const { lyrics } = load;
  if (lyrics.kind === 'synced') return <SyncedLyrics lines={lyrics.lines} />;
  if (lyrics.kind === 'plain') {
    return (
      <ScrollView contentContainerStyle={styles.plain}>
        <Txt variant="headline" style={styles.plainText}>
          {lyrics.text}
        </Txt>
      </ScrollView>
    );
  }
  return (
    <View style={styles.center}>
      <Icon name={lyrics.kind === 'instrumental' ? 'music' : 'align-left'} size={24} color="fgSecondary" />
      <Txt tone="secondary">{lyrics.kind === 'instrumental' ? 'Instrumental' : 'No lyrics found for this track.'}</Txt>
    </View>
  );
}

const ROW = 52;

function SyncedLyrics({ lines }: { lines: LyricLine[] }) {
  const list = useRef<FlatList<LyricLine>>(null);
  const position = useApp((s) => s.status.positionMs);
  const current = useMemo(() => activeLine(lines, position), [lines, position]);

  useEffect(() => {
    if (current < 0) return;
    list.current?.scrollToIndex({ index: current, viewPosition: 0.4, animated: true });
  }, [current]);

  const onSeek = useCallback((ms: number) => seekTo(ms), []);

  return (
    <FlatList
      ref={list}
      data={lines}
      keyExtractor={(line, index) => `${line.timeMs}:${index}`}
      renderItem={({ item, index }) => <Line line={item} state={index === current ? 'now' : index < current ? 'past' : 'next'} onSeek={onSeek} />}
      extraData={current}
      getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
      contentContainerStyle={styles.synced}
      showsVerticalScrollIndicator={false}
    />
  );
}

const Line = memo(function Line({
  line,
  state,
  onSeek,
}: {
  line: LyricLine;
  state: 'past' | 'now' | 'next';
  onSeek: (ms: number) => void;
}) {
  const colors = useColors();
  return (
    <PressableScale onPress={() => onSeek(line.timeMs)} accessibilityLabel={line.text || 'Instrumental break'} style={styles.line}>
      <Txt
        numberOfLines={2}
        style={[
          state === 'now' ? type.headline : type.bodyStrong,
          { color: state === 'now' ? colors.fgPrimary : state === 'past' ? colors.fgTertiary : colors.fgSecondary },
        ]}
      >
        {line.text || '♪'}
      </Txt>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  retry: { minHeight: 44, paddingHorizontal: space.lg, justifyContent: 'center' },
  plain: { paddingVertical: space.lg },
  plainText: { lineHeight: 32 },
  synced: { paddingVertical: ROW * 2 },
  line: { height: ROW, justifyContent: 'center' },
});
