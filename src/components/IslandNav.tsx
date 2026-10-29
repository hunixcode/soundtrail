import { useCallback, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useTabTrigger } from 'expo-router/ui';
import { GestureDetector, usePanGesture, useTapGesture, useExclusiveGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { currentItem, next, previous, togglePlay, useApp } from '../state/app';
import { rememberTab, type TabName } from '../state/nav';
import { subtitle } from '../library/format';
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
const TAB_COMPACT = 52;
const TAB_ROW_PADDING = space.sm;

export function useIslandMetrics(onPlayer: boolean) {
  const insets = useSafeAreaInsets();
  const hasTrack = useApp((s) => s.status.index >= 0);
  const expanded = hasTrack && !onPlayer;
  const height = layout.navHeight + (expanded ? STRIP_HEIGHT : 0);
  return { expanded, height, bottom: insets.bottom + layout.navGap, reserve: insets.bottom + layout.navGap * 2 + height };
}

type TabItemProps = (typeof TABS)[number] & {
  index: number;
  nav: SharedValue<Nav>;
  progress: SharedValue<number>;
  labelWidths: SharedValue<number[]>;
  onFocus: (index: number) => void;
};

type Nav = { from: number; to: number };

function weight(nav: Nav, t: number, index: number) {
  'worklet';
  if (index === nav.to) return nav.from === nav.to ? 1 : t;
  return index === nav.from ? 1 - t : 0;
}

function tabWidth(nav: Nav, t: number, index: number, labelWidths: number[]) {
  'worklet';
  return TAB_COMPACT + ((labelWidths[index] ?? 0) + space.sm) * weight(nav, t, index);
}

function TabItem({ name, label, icon, index, nav, progress, labelWidths, onFocus }: TabItemProps) {
  const { trigger, triggerProps } = useTabTrigger({ name });
  const focused = trigger?.isFocused ?? false;

  useEffect(() => {
    if (!focused) return;
    rememberTab(name);
    onFocus(index);
  }, [focused, name, index, onFocus]);

  const box = useAnimatedStyle(() => ({ width: tabWidth(nav.value, progress.value, index, labelWidths.value) }));
  const text = useAnimatedStyle(() => {
    const w = weight(nav.value, progress.value, index);
    return { opacity: w * w, transform: [{ translateX: (1 - w) * -space.sm }] };
  });
  const glyph = useAnimatedStyle(() => ({ opacity: 0.65 + 0.35 * weight(nav.value, progress.value, index) }));

  const onLabelLayout = (e: LayoutChangeEvent) => {
    const width = Math.ceil(e.nativeEvent.layout.width);
    labelWidths.modify((widths) => {
      'worklet';
      widths[index] = width;
      return widths;
    });
  };

  return (
    <Animated.View style={[styles.tabBox, box]}>
      <PressableScale
        onPress={triggerProps.onPress}
        onLongPress={triggerProps.onLongPress}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        style={styles.tab}
      >
        <Animated.View style={glyph}>
          <Icon name={icon} size={20} />
        </Animated.View>
        <Animated.View style={[styles.label, text]}>
          <Txt variant="label" numberOfLines={1} onLayout={onLabelLayout}>
            {label}
          </Txt>
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

function NowPlayingStrip({ open }: { open: SharedValue<number> }) {
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
      offset.set(e.translationX * 0.6);
    },
    onDeactivate: (e) => {
      if (e.translationX < -60) scheduleOnRN(next);
      else if (e.translationX > 60) scheduleOnRN(previous);
      offset.set(withSpring(0, motion.spring));
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

  const reveal = useAnimatedStyle(() => ({ opacity: open.value * open.value }));

  return (
    <Animated.View style={[styles.strip, { borderBottomColor: colors.borderSubtle }, reveal]}>
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
              {item ? subtitle(item) : ''}
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
  const hasTrack = useApp((s) => s.status.index >= 0);
  const { expanded, bottom } = useIslandMetrics(onPlayer);

  const collapsedWidth = Math.min(width - layout.gutter * 2, 380);
  const expandedWidth = Math.min(width - layout.gutter * 2, 520);
  const open = useSharedValue(expanded ? 1 : 0);
  const nav = useSharedValue<Nav>({ from: -1, to: -1 });
  const progress = useSharedValue(1);
  const labelWidths = useSharedValue<number[]>(TABS.map(() => 0));

  useEffect(() => {
    open.set(withSpring(expanded ? 1 : 0, motion.spring));
  }, [expanded, open]);

  const onFocus = useCallback(
    (index: number) => {
      const { from, to } = nav.value;
      if (to < 0) {
        nav.set({ from: index, to: index });
        return;
      }
      nav.set({ from: progress.value < 0.5 ? from : to, to: index });
      progress.set(0);
      progress.set(withSpring(1, motion.spring));
    },
    [nav, progress],
  );

  const container = useAnimatedStyle(() => ({
    width: collapsedWidth + (expandedWidth - collapsedWidth) * open.value,
    height: layout.navHeight + STRIP_HEIGHT * open.value,
  }));

  const indicator = useAnimatedStyle(() => {
    const { from, to } = nav.value;
    const t = progress.value;
    const islandWidth = collapsedWidth + (expandedWidth - collapsedWidth) * open.value;
    const inner = islandWidth - StyleSheet.hairlineWidth * 2 - TAB_ROW_PADDING * 2;
    const widths = TABS.map((_, i) => tabWidth(nav.value, t, i, labelWidths.value));
    const gap = (inner - widths.reduce((sum, w) => sum + w, 0)) / (TABS.length - 1);
    const lefts = widths.map((_, i) => TAB_ROW_PADDING + widths.slice(0, i).reduce((sum, w) => sum + w + gap, 0));
    if (to < 0) return { opacity: 0 };
    return {
      opacity: 1,
      width: widths[from] + (widths[to] - widths[from]) * t,
      transform: [{ translateX: lefts[from] + (lefts[to] - lefts[from]) * t }],
    };
  });

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.anchor, { paddingBottom: bottom }]}>
      <Animated.View
        style={[
          styles.island,
          { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle },
          container,
        ]}
      >
        {hasTrack ? (
          <View pointerEvents={expanded ? 'auto' : 'none'}>
            <NowPlayingStrip open={open} />
          </View>
        ) : null}
        <View style={styles.tabs}>
          <Animated.View style={[styles.indicator, { backgroundColor: colors.bgSunken }, indicator]} />
          {TABS.map((tab, index) => (
            <TabItem
              key={tab.name}
              {...tab}
              index={index}
              nav={nav}
              progress={progress}
              labelWidths={labelWidths}
              onFocus={onFocus}
            />
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
    paddingHorizontal: TAB_ROW_PADDING,
  },
  indicator: { position: 'absolute', left: 0, height: 48, borderRadius: radius.pill },
  tabBox: { height: 48, borderRadius: radius.pill, overflow: 'hidden' },
  tab: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: (TAB_COMPACT - 20) / 2,
  },
  label: { position: 'absolute', left: (TAB_COMPACT - 20) / 2 + 20 + space.sm, width: 160, alignItems: 'flex-start' },
});
