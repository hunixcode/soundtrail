import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { formatTime } from '../library/format';
import { cycleRepeat, next, previous, seekTo, togglePlay, toggleShuffle, useApp } from '../state/app';
import { useColors } from '../theme/useTheme';
import { space } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Slider } from './Slider';
import { Txt } from './Txt';

export function Progress() {
  const position = useApp((s) => s.status.positionMs);
  const duration = useApp((s) => s.status.durationMs);
  const [preview, setPreview] = useState<number | null>(null);
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;
  const shown = preview ?? position;

  return (
    <View style={styles.progress}>
      <Slider
        value={ratio}
        steps={1000}
        onChange={(r) => setPreview(r * duration)}
        onCommit={(r) => {
          setPreview(null);
          if (duration > 0) seekTo(r * duration);
        }}
        label="Playback position"
        valueText={`${formatTime(shown)} of ${formatTime(duration)}`}
      />
      <View style={styles.times}>
        <Txt variant="mono" tone="secondary">
          {formatTime(shown)}
        </Txt>
        <Txt variant="mono" tone="secondary">
          -{formatTime(Math.max(0, duration - shown))}
        </Txt>
      </View>
    </View>
  );
}

function ToggleButton({ icon, active, label, onPress, badge }: { icon: IconName; active: boolean; label: string; onPress: () => void; badge?: string }) {
  const colors = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: active }} style={styles.control}>
      <Icon name={icon} size={20} color={active ? 'fgPrimary' : 'fgTertiary'} />
      {badge ? (
        <View style={[styles.repeatBadge, { backgroundColor: colors.fgPrimary }]}>
          <Txt variant="mono" tone="inverse" style={styles.repeatBadgeText}>
            {badge}
          </Txt>
        </View>
      ) : null}
      {active ? <View style={[styles.dot, { backgroundColor: colors.fgPrimary }]} /> : null}
    </PressableScale>
  );
}

export function Controls() {
  const colors = useColors();
  const playing = useApp((s) => s.status.playWhenReady);
  const shuffle = useApp((s) => s.prefs.shuffle);
  const repeat = useApp((s) => s.prefs.repeat);

  return (
    <View style={styles.controls}>
      <ToggleButton icon="shuffle" active={shuffle} label="Shuffle" onPress={toggleShuffle} />
      <PressableScale onPress={previous} accessibilityLabel="Previous track" style={styles.control}>
        <Icon name="skip-back" size={28} />
      </PressableScale>
      <PressableScale
        onPress={togglePlay}
        accessibilityLabel={playing ? 'Pause' : 'Play'}
        style={[styles.play, { backgroundColor: colors.fgPrimary }]}
      >
        <Animated.View key={playing ? 'pause' : 'play'} entering={FadeIn.duration(150)}>
          <Icon name={playing ? 'pause' : 'play'} size={30} color="fgInverse" />
        </Animated.View>
      </PressableScale>
      <PressableScale onPress={next} accessibilityLabel="Next track" style={styles.control}>
        <Icon name="skip-forward" size={28} />
      </PressableScale>
      <ToggleButton
        icon="repeat"
        active={repeat !== 'off'}
        label={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat off'}
        onPress={cycleRepeat}
        badge={repeat === 'one' ? '1' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 0 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -space.sm },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.sm },
  control: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  play: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
  repeatBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadgeText: { fontSize: 9, lineHeight: 12 },
});
