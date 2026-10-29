import { useCallback, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { BlurTargetView, BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import type { LibraryItem } from '../../../modules/soundtrail-audio';
import { Artwork } from '../../components/Artwork';
import { Icon, type IconName } from '../../components/Icon';
import { useIslandMetrics } from '../../components/IslandNav';
import { LyricsView } from '../../components/LyricsView';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { Slider } from '../../components/Slider';
import { TrackRow } from '../../components/TrackRow';
import { Txt } from '../../components/Txt';
import { FINE_SPEED, SPEED_STEP, formatSpeed } from '../../audio/speed';
import { formatTime, subtitle } from '../../library/format';
import {
  currentItem,
  cycleRepeat,
  next,
  previous,
  seekTo,
  setSpeed,
  skipTo,
  togglePlay,
  toggleShuffle,
  useApp,
} from '../../state/app';
import { TAB_HREF, previousTab } from '../../state/nav';
import { useColors, useScheme } from '../../theme/useTheme';
import { layout, motion, radius, space } from '../../theme/tokens';

type Stage = 'art' | 'lyrics' | 'queue';

const STAGE_LABEL: Record<Stage, string> = { art: 'Now playing', lyrics: 'Lyrics', queue: 'Up next' };

export default function PlayerScreen() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const { reserve } = useIslandMetrics(true);
  const item = useApp(currentItem);
  const [stage, setStage] = useState<Stage>('art');
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const badgeSlot = useRef<ComponentRef<typeof View>>(null);
  const [tuning, setTuning] = useState(false);

  const closeOutside = (e: GestureResponderEvent) => {
    if (!tuning) return;
    const { pageX, pageY } = e.nativeEvent;
    badgeSlot.current?.measure((_x, _y, w, h, left, top) => {
      const inside = pageX >= left && pageX <= left + w && pageY >= top + h - OPEN_HEIGHT && pageY <= top + h;
      if (!inside) setTuning(false);
    });
  };
  const toggle = (next: Stage) => setStage((s) => (s === next ? 'art' : next));
  const artSize = Math.min(width - space.xxl * 2, layout.maxContentWidth - space.xxl * 2, height * 0.42);

  const rise = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      rise.set(withDelay(40, withTiming(1, motion.slow)));
      return () => {
        rise.set(0);
        setTuning(false);
      };
    }, [rise]),
  );
  const artStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 24 }, { scale: 0.94 + rise.value * 0.06 }],
  }));

  return (
    <Screen onTouchStart={closeOutside}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          <PressableScale
            onPress={() => router.navigate(TAB_HREF[previousTab()])}
            accessibilityLabel="Close player"
            style={styles.iconButton}
          >
            <Icon name="chevron-down" size={26} />
          </PressableScale>
        </View>
        <Txt variant="label" tone="secondary">
          {STAGE_LABEL[stage]}
        </Txt>
        <View style={[styles.side, styles.sideEnd]}>
          <PressableScale
            onPress={() => toggle('lyrics')}
            accessibilityLabel={stage === 'lyrics' ? 'Hide lyrics' : 'Show lyrics'}
            accessibilityState={{ selected: stage === 'lyrics' }}
            style={styles.iconButton}
          >
            <Icon name="align-left" size={22} color={stage === 'lyrics' ? 'fgPrimary' : 'fgSecondary'} />
          </PressableScale>
          <PressableScale
            onPress={() => toggle('queue')}
            accessibilityLabel={stage === 'queue' ? 'Hide queue' : 'Show queue'}
            accessibilityState={{ selected: stage === 'queue' }}
            style={styles.iconButton}
          >
            <Icon name="list" size={22} color={stage === 'queue' ? 'fgPrimary' : 'fgSecondary'} />
          </PressableScale>
        </View>
      </View>

      {item ? (
        <View style={[styles.body, { paddingBottom: reserve }]}>
          <BlurTargetView ref={blurTarget} style={styles.stage}>
            {stage === 'queue' ? (
              <Animated.View key="queue" entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.fill}>
                <Queue />
              </Animated.View>
            ) : stage === 'lyrics' ? (
              <Animated.View key="lyrics" entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.lyrics}>
                <LyricsView item={item} />
              </Animated.View>
            ) : (
              <Animated.View key="art" entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.artWrap}>
                <Animated.View style={artStyle}>
                  <Artwork item={item} size={artSize} />
                </Animated.View>
              </Animated.View>
            )}
          </BlurTargetView>

          <View style={styles.meta}>
            <View style={styles.metaText}>
              <Txt variant="title" numberOfLines={2}>
                {item.title}
              </Txt>
              <Txt tone="secondary" numberOfLines={1}>
                {subtitle(item)}
              </Txt>
            </View>
            <SpeedBadge blurTarget={blurTarget} slotRef={badgeSlot} open={tuning} onToggle={() => setTuning((v) => !v)} />
          </View>

          <Progress />
          <Controls />
        </View>
      ) : (
        <View style={[styles.empty, { paddingBottom: reserve }]}>
          <View style={[styles.emptyArt, { backgroundColor: colors.bgSunken }]}>
            <Icon name="disc" size={40} color="fgTertiary" />
          </View>
          <Txt variant="headline">Nothing playing</Txt>
          <Txt tone="secondary" style={styles.centerText}>
            Pick a song from your library.
          </Txt>
          <PressableScale onPress={() => router.navigate('/')} style={[styles.primary, { backgroundColor: colors.fgPrimary }]}>
            <Txt variant="bodyStrong" tone="inverse">
              Open library
            </Txt>
          </PressableScale>
        </View>
      )}
    </Screen>
  );
}

const FINE_STEPS = Math.round((FINE_SPEED.max - FINE_SPEED.min) / SPEED_STEP);
const BADGE_WIDTH = 76;
const BADGE_HEIGHT = 36;
const OPEN_WIDTH = 32;
const OPEN_HEIGHT = 220;
const FINE_THUMB = 14;

function SpeedBadge({
  blurTarget,
  slotRef,
  open,
  onToggle,
}: {
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
  slotRef: RefObject<ComponentRef<typeof View> | null>;
  open: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  const scheme = useScheme();
  const speed = useApp((s) => s.prefs.speed);
  const grow = useSharedValue(0);
  const span = FINE_SPEED.max - FINE_SPEED.min;
  const ratio = (Math.min(FINE_SPEED.max, Math.max(FINE_SPEED.min, speed)) - FINE_SPEED.min) / span;
  const onChange = useCallback((r: number) => setSpeed(FINE_SPEED.min + r * span), [span]);

  useEffect(() => {
    grow.set(withSpring(open ? 1 : 0, motion.spring));
  }, [open, grow]);

  const shell = useAnimatedStyle(() => ({
    width: BADGE_WIDTH + grow.value * (OPEN_WIDTH - BADGE_WIDTH),
    right: (grow.value * (BADGE_WIDTH - OPEN_WIDTH)) / 2,
    height: BADGE_HEIGHT + grow.value * (OPEN_HEIGHT - BADGE_HEIGHT),
  }));
  const reveal = useAnimatedStyle(() => ({ opacity: grow.value * grow.value }));
  const label = useAnimatedStyle(() => ({ opacity: (1 - grow.value) * (1 - grow.value) }));

  return (
    <View ref={slotRef} style={styles.badgeSlot}>
      <Animated.View
        style={[
          styles.badge,
          { borderColor: colors.borderSubtle },
          shell,
        ]}
      >
        <BlurView
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={40}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.badgeInner, reveal]} pointerEvents={open ? 'auto' : 'none'}>
          <Slider
            vertical
            value={ratio}
            steps={FINE_STEPS}
            onChange={onChange}
            thickness={2}
            thumbSize={FINE_THUMB}
            label="Playback speed"
            valueText={formatSpeed(speed)}
          />
        </Animated.View>
        <PressableScale
          onPress={onToggle}
          accessibilityLabel={`Playback speed ${formatSpeed(speed)}. ${open ? 'Closes' : 'Opens'} the speed slider.`}
          accessibilityState={{ expanded: open }}
          style={styles.badgeFace}
        >
          <Animated.View style={label}>
            <Txt variant="mono" tone={speed === 1 ? 'secondary' : 'primary'} numberOfLines={1}>
              {formatSpeed(speed)}
            </Txt>
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

function Progress() {
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

function Controls() {
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

function Queue() {
  const queue = useApp((s) => s.queue);
  const mediaId = useApp((s) => s.status.mediaId);
  const playing = useApp((s) => s.status.isPlaying);
  const onPress = useCallback((item: LibraryItem) => skipTo(queue.indexOf(item)), [queue]);

  if (queue.length === 0) {
    return (
      <View style={styles.queueEmpty}>
        <Txt tone="secondary">The queue is empty.</Txt>
      </View>
    );
  }
  return (
    <FlatList
      data={queue}
      keyExtractor={(item, index) => `${item.id}:${index}`}
      renderItem={({ item }) => <TrackRow item={item} active={item.id === mediaId} playing={playing} onPress={onPress} />}
      initialScrollIndex={Math.max(0, queue.findIndex((q) => q.id === mediaId))}
      getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
    />
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    height: 56,
  },
  side: { width: 96, flexDirection: 'row' },
  sideEnd: { justifyContent: 'flex-end' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: space.xl, gap: space.lg },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  fill: { alignSelf: 'stretch', flex: 1, marginHorizontal: -space.xl },
  lyrics: { alignSelf: 'stretch', flex: 1 },
  artWrap: { alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  metaText: { flex: 1, gap: space.xs },
  badgeSlot: { width: BADGE_WIDTH, height: BADGE_HEIGHT },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
  },
  badgeInner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BADGE_HEIGHT,
    height: OPEN_HEIGHT - BADGE_HEIGHT,
    alignItems: 'center',
    paddingTop: space.lg,
  },
  badgeFace: { position: 'absolute', left: 0, right: 0, bottom: 0, height: BADGE_HEIGHT - 2, alignItems: 'center', justifyContent: 'center' },
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xxl },
  emptyArt: { width: 120, height: 120, borderRadius: radius.artwork, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  primary: {
    marginTop: space.sm,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
