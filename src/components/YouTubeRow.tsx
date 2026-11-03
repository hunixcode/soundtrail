import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatTime } from '../library/format';
import type { YtResult } from '../online/youtube';
import { useDownload, type Download } from '../state/downloads';
import { useColors } from '../theme/useTheme';
import { layout, space } from '../theme/tokens';
import { Artwork } from './Artwork';
import { Icon } from './Icon';
import { Txt } from './Txt';

type Props = { item: YtResult; onPress: (item: YtResult) => void };

function stateLabel(item: YtResult, job: Download | undefined): string {
  if (item.kind === 'list') return 'Opens the list';
  if (!job) return 'Download';
  if (job.status === 'queued') return 'Waiting to download';
  if (job.status === 'active') return `Downloading, ${job.progress}%`;
  return job.status === 'done' ? 'Downloaded' : 'Download failed, tap to retry';
}

export const YouTubeRow = memo(function YouTubeRow({ item, onPress }: Props) {
  const colors = useColors();
  const job = useDownload(item.id);
  const details =
    item.kind === 'track'
      ? [item.artist, item.durationMs ? formatTime(item.durationMs) : null].filter(Boolean).join(' · ')
      : item.subtitle;

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: colors.bgSunken }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${details}. ${stateLabel(item, job)}`}
      style={[styles.row, { borderBottomColor: colors.borderSubtle }]}
    >
      <Artwork item={null} url={item.artworkUrl} size={48} />
      <View style={styles.text}>
        <Txt numberOfLines={1}>{item.title}</Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {details}
        </Txt>
      </View>
      <View style={styles.state}>
        {item.kind === 'list' ? (
          <Icon name="chevron-right" size={18} color="fgTertiary" />
        ) : job?.status === 'active' ? (
          <Txt variant="mono">{job.progress}%</Txt>
        ) : (
          <Icon
            name={!job ? 'download' : job.status === 'queued' ? 'clock' : job.status === 'done' ? 'check' : 'alert-circle'}
            size={20}
            color={job?.status === 'queued' ? 'fgTertiary' : 'fgPrimary'}
          />
        )}
      </View>
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
  state: { width: 44, alignItems: 'center' },
});
