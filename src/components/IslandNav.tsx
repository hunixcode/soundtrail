import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useTabTrigger } from 'expo-router/ui';
import { GestureDetector, usePanGesture, useTapGesture, useExclusiveGestures } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { currentItem, next, previous, togglePlay, useApp } from '../state/app';
import { rememberTab, type TabName } from '../state/nav';
import { useColors } from '../theme/useTheme';
import { layout, motion, radius, space } from '../theme/tokens';
import { Artwork } from './Artwork';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export const TABS: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'library', label: 'Library', icon: 'music' },
  { name: 'player', label: 'Player', icon: 'disc' },
  { name: 'speed', label: 'Speed', icon: 'fast-forward' },
  { name: 'equalizer', label: 'EQ', icon: 'sliders' },
];

const STRIP_HEIGHT = 60;

export function useIslandMetrics(onPlayer: boolean) {
  const insets = useSafeAreaInsets();
  const hasTrack = useApp((s) => s.status.index >= 0);
  const expanded = hasTrack && !onPlayer;
  const height = layout.navHeight + (expanded ? STRIP_HEIGHT : 0);
  return { expanded, height, bottom: insets.bottom + layout.navGap, reserve: insets.bottom + layout.navGap * 2 + height };
}

type TabItemProps = (typeof TABS)[number] & {
  onMeasure: (name: TabName, x: number, w: number) => void;
  onFocus: (name: TabName) => void;
};

function TabItem({ name, label, icon, onMeasure, onFocus }: TabItemProps) {
  const { trigger, triggerProps } = useTabTrigger({ name });
  const focused = trigger?.isFocused ?? false;

  useEffect(() => {
    if (!focused) return;
    rememberTab(name);
    onFocus(name);
  }, [focused, name, onFocus]);

  return (
    <Animated.View
      layout={LinearTransition.duration(motion.base.duration)}
      onLayout={(e: LayoutChangeEvent) => onMeasure(name, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
    >
      <PressableScale
        onPress={triggerProps.onPress}
        onLongPress={triggerProps.onLongPress}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        style={[styles.tab, focused && styles.tabActive]}
      >
        <Icon name={icon} size={20} color={focused ? 'fgPrimary' : 'fgSecondary'} />
        {focused ? (
          <Animated.View entering={FadeIn.duration(motion.fast.duration)} exiting={FadeOut.duration(motion.fast.duration)}>
            <Txt variant="label">{label}</Txt>
          </Animated.View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

function NowPlayingStrip() {
  const colors = useColors();
  const item = useApp(currentItem);
  const playing = useApp((s) => s.status.playWhenReady);
  const { switchTab } = useTabTrigger({ name: 'player' });
  const offset = useSharedValue(0);

  const openPlayer = () => switchTab('player', {});

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      offset.value = e.translationX * 0.6;
    },
    onDeactivate: (e) => {
      if (e.translationX < -60) scheduleOnRN(next);
      else if (e.translationX > 60) scheduleOnRN(previous);
      offset.value = withSpring(0, motion.spring);
    },
  });
  const tap = useTapGesture({
    onDeactivate: (e) => {
      if (!e.canceled) scheduleOnRN(openPlayer);
    },
  });
  const gesture = useExclusiveGestures(pan, tap);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    opacity: 1 - Math.min(0.6, Math.abs(offset.value) / 160),
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(motion.fast.duration).delay(80)}
      exiting={FadeOut.duration(motion.fast.duration)}
      style={[styles.strip, { borderBottomColor: colors.borderSubtle }]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.stripMain, slide]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${item?.title ?? ''}. Opens the player.`}
        >
          <Artwork item={item} size={40} />
          <View style={styles.stripText}>
            <Txt variant="bodyStrong" numberOfLines={1}>
              {item?.title ?? 'Now playing'}
            </Txt>
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              {item?.artist ?? (item?.kind === 'video' ? 'Video' : 'Unknown artist')}
            </Txt>
          </View>
        </Animated.View>
      </GestureDetector>
      <PressableScale onPress={togglePlay} accessibilityLabel={playing ? 'Pause' : 'Play'} style={styles.stripButton}>
        <Icon name={playing ? 'pause' : 'play'} size={22} />
      </PressableScale>
      <PressableScale onPress={next} accessibilityLabel="Next track" style={styles.stripButton}>
        <Icon name="skip-forward" size={20} />
      </PressableScale>
    </Animated.View>
  );
}

export function IslandNav() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { trigger: playerTrigger } = useTabTrigger({ name: 'player' });
  const onPlayer = playerTrigger?.isFocused ?? false;
  const { expanded, height, bottom } = useIslandMetrics(onPlayer);
  const [frames, setFrames] = useState<Partial<Record<TabName, { x: number; w: number }>>>({});

  const collapsedWidth = Math.min(width - layout.gutter * 2, 380);
  const expandedWidth = Math.min(width - layout.gutter * 2, 520);
  const islandWidth = useSharedValue(expanded ? expandedWidth : collapsedWidth);
  const islandHeight = useSharedValue(height);

  useEffect(() => {
    islandWidth.value = withSpring(expanded ? expandedWidth : collapsedWidth, motion.spring);
    islandHeight.value = withSpring(height, motion.spring);
  }, [expanded, expandedWidth, collapsedWidth, height, islandWidth, islandHeight]);

  const container = useAnimatedStyle(() => ({ width: islandWidth.value, height: islandHeight.value }));

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const [active, setActive] = useState<TabName>('library');

  const onMeasure = (name: TabName, x: number, w: number) => {
    setFrames((f) => (f[name]?.x === x && f[name]?.w === w ? f : { ...f, [name]: { x, w } }));
  };

  useEffect(() => {
    const frame = frames[active];
    if (!frame) return;
    if (indicatorW.value === 0) {
      indicatorX.value = frame.x;
      indicatorW.value = frame.w;
    } else {
      indicatorX.value = withSpring(frame.x, motion.spring);
      indicatorW.value = withSpring(frame.w, motion.spring);
    }
  }, [active, frames, indicatorX, indicatorW]);

  const indicator = useAnimatedStyle(() => ({
    width: indicatorW.value,
    transform: [{ translateX: indicatorX.value }],
    opacity: withTiming(indicatorW.value > 0 ? 1 : 0, motion.fast),
  }));

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.anchor, { paddingBottom: bottom }]}>
      <Animated.View
        style={[
          styles.island,
          { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle },
          container,
        ]}
      >
        {expanded ? <NowPlayingStrip /> : null}
        <View style={styles.tabs}>
          <Animated.View style={[styles.indicator, { backgroundColor: colors.bgSunken }, indicator]} />
          {TABS.map((tab) => (
            <TabItem key={tab.name} {...tab} onMeasure={onMeasure} onFocus={setActive} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { justifyContent: 'flex-end', alignItems: 'center' },
  island: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
  },
  strip: {
    height: STRIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.md,
    paddingRight: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stripMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, height: '100%' },
  stripText: { flex: 1, gap: 2 },
  stripButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    height: layout.navHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
  },
  indicator: { position: 'absolute', left: 0, height: 48, borderRadius: radius.pill },
  tab: {
    height: 48,
    minWidth: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  tabActive: { paddingHorizontal: space.lg },
});
