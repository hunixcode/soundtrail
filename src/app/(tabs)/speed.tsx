import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useIslandMetrics } from '../../components/IslandNav';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { Slider } from '../../components/Slider';
import { Txt } from '../../components/Txt';
import {
  MAX_SPEED,
  MIN_SPEED,
  SPEED_PRESETS,
  SPEED_STEP,
  formatSpeed,
  ratioToSpeed,
  speedToRatio,
  stepSpeed,
} from '../../audio/speed';
import { currentItem, setSpeed, useApp } from '../../state/app';
import { useColors } from '../../theme/useTheme';
import { layout, radius, space, type } from '../../theme/tokens';

const STEPS = Math.round((MAX_SPEED - MIN_SPEED) / SPEED_STEP);

export default function SpeedScreen() {
  const colors = useColors();
  const { reserve } = useIslandMetrics(false);
  const speed = useApp((s) => s.prefs.speed);
  const item = useApp(currentItem);
  const [whole, fraction] = speed.toFixed(2).split('.');

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: reserve }]} showsVerticalScrollIndicator={false}>
        <Txt variant="title" accessibilityRole="header">
          Speed
        </Txt>

        <View style={styles.readoutWrap} accessible accessibilityLabel={`Current speed ${formatSpeed(speed)}`}>
          <View style={styles.readout}>
            <Txt style={[type.monoDisplay, styles.readoutText]}>{whole}</Txt>
            <Txt style={[type.monoDisplay, styles.readoutText]} tone="secondary">
              .{fraction}
            </Txt>
            <Txt variant="headline" tone="tertiary" style={styles.x}>
              x
            </Txt>
          </View>
          <Txt variant="caption" tone="secondary">
            Pitch stays the same
          </Txt>
        </View>

        <View style={styles.sliderBlock}>
          <Slider
            value={speedToRatio(speed)}
            steps={STEPS}
            onChange={(r) => setSpeed(ratioToSpeed(r))}
            thickness={4}
            label="Playback speed"
            valueText={formatSpeed(speed)}
          />
          <View style={styles.scale}>
            {[MIN_SPEED, 1, 1.5, MAX_SPEED].map((mark) => (
              <Txt key={mark} variant="mono" tone="tertiary">
                {mark.toFixed(1)}x
              </Txt>
            ))}
          </View>
        </View>

        <View style={styles.stepper}>
          <StepButton icon="minus" label="Slower" disabled={speed <= MIN_SPEED} onPress={() => setSpeed(stepSpeed(speed, -1))} />
          <PressableScale
            onPress={() => setSpeed(1)}
            accessibilityLabel="Reset speed to 1x"
            style={[styles.reset, { borderColor: colors.borderSubtle }]}
          >
            <Icon name="rotate-ccw" size={16} color="fgSecondary" />
            <Txt variant="bodyStrong" tone="secondary">
              Reset
            </Txt>
          </PressableScale>
          <StepButton icon="plus" label="Faster" disabled={speed >= MAX_SPEED} onPress={() => setSpeed(stepSpeed(speed, 1))} />
        </View>

        <View style={styles.section}>
          <Txt variant="label" tone="secondary">
            Quick presets
          </Txt>
          <View style={styles.presets}>
            {SPEED_PRESETS.map((preset) => (
              <Chip key={preset} label={formatSpeed(preset)} selected={speed === preset} onPress={() => setSpeed(preset)} />
            ))}
          </View>
        </View>

        <Animated.View key={item?.id ?? 'none'} entering={FadeIn.duration(250)} style={[styles.nowCard, { backgroundColor: colors.bgRaised }]}>
          <Icon name={item ? 'volume-2' : 'info'} size={18} color="fgSecondary" />
          <Txt tone="secondary" numberOfLines={2} style={styles.flex}>
            {item ? `Applies to “${item.title}” and everything after it.` : 'No track loaded. This speed applies to the next one you play.'}
          </Txt>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function StepButton({ icon, label, onPress, disabled }: { icon: 'minus' | 'plus'; label: string; onPress: () => void; disabled: boolean }) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.step, { backgroundColor: colors.bgRaised, opacity: disabled ? 0.4 : 1 }]}
    >
      <Icon name={icon} size={24} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: space.xl, flexGrow: 1 },
  readoutWrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  readout: { flexDirection: 'row', alignItems: 'baseline' },
  readoutText: { fontSize: 88, lineHeight: 96 },
  x: { marginLeft: space.xs },
  sliderBlock: { gap: 0 },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  section: { gap: space.md },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  nowCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.card },
  flex: { flex: 1 },
});
