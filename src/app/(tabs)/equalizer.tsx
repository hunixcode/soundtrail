import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { EqBand } from '../../../modules/soundtrail-audio';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useIslandMetrics } from '../../components/IslandNav';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { Slider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import { Txt } from '../../components/Txt';
import { formatHz } from '../../audio/presets';
import {
  ERROR_MESSAGES,
  allPresets,
  applyPreset,
  deletePreset,
  savePreset,
  setBandGain,
  setEqEnabled,
  useApp,
} from '../../state/app';
import { useColors } from '../../theme/useTheme';
import { layout, motion, radius, space, type } from '../../theme/tokens';

const GAIN_STEP = 0.5;

export default function EqualizerScreen() {
  const colors = useColors();
  const { reserve } = useIslandMetrics(false);
  const equalizer = useApp((s) => s.equalizer);
  const ready = useApp((s) => s.ready);
  const userPresets = useApp((s) => s.prefs.userPresets);
  const activePresetId = useApp((s) => s.prefs.activePresetId);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const dim = useAnimatedStyle(() => ({ opacity: withTiming(equalizer.enabled ? 1 : 0.4, motion.base) }));

  const onSave = () => {
    if (savePreset(name)) {
      setName('');
      setNaming(false);
    }
  };

  const confirmDelete = (id: string, presetName: string) => {
    Alert.alert('Delete preset', `Delete “${presetName}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePreset(id) },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: reserve }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Txt variant="title" accessibilityRole="header">
            Equalizer
          </Txt>
          {equalizer.available ? <Toggle value={equalizer.enabled} onChange={setEqEnabled} label="Equalizer" /> : null}
        </View>

        {!ready ? null : !equalizer.available ? (
          <View style={[styles.unavailable, { backgroundColor: colors.bgRaised }]}>
            <Icon name="slash" size={20} color="fgSecondary" />
            <Txt tone="secondary" style={styles.flex}>
              {ERROR_MESSAGES.EQ_UNAVAILABLE} Playback and speed still work.
            </Txt>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Txt variant="label" tone="secondary">
                Presets
              </Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
                {allPresets(userPresets).map((preset) => (
                  <Chip
                    key={preset.id}
                    label={preset.name}
                    selected={activePresetId === preset.id}
                    onPress={() => applyPreset(preset)}
                    onLongPress={preset.builtIn ? undefined : () => confirmDelete(preset.id, preset.name)}
                    accessibilityHint={preset.builtIn ? undefined : 'Long press to delete'}
                  />
                ))}
              </ScrollView>
            </View>

            <Animated.View style={[styles.bands, { backgroundColor: colors.bgRaised }, dim]}>
              <View style={[styles.zeroLine, { backgroundColor: colors.borderSubtle }]} />
              {equalizer.bands.map((band) => (
                <BandSlider key={band.index} band={band} />
              ))}
            </Animated.View>

            {naming ? (
              <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.saveRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Preset name"
                  placeholderTextColor={colors.fgTertiary}
                  autoFocus
                  maxLength={40}
                  onSubmitEditing={onSave}
                  returnKeyType="done"
                  style={[type.body, styles.input, { color: colors.fgPrimary, backgroundColor: colors.bgSunken }]}
                  accessibilityLabel="Preset name"
                />
                <PressableScale
                  onPress={onSave}
                  disabled={!name.trim()}
                  accessibilityLabel="Save preset"
                  style={[styles.primary, { backgroundColor: colors.fgPrimary, opacity: name.trim() ? 1 : 0.4 }]}
                >
                  <Txt variant="bodyStrong" tone="inverse">
                    Save
                  </Txt>
                </PressableScale>
                <PressableScale onPress={() => setNaming(false)} accessibilityLabel="Cancel" style={styles.iconButton}>
                  <Icon name="x" size={20} color="fgSecondary" />
                </PressableScale>
              </Animated.View>
            ) : (
              <PressableScale onPress={() => setNaming(true)} style={[styles.outline, { borderColor: colors.borderSubtle }]}>
                <Icon name="plus" size={18} />
                <Txt variant="bodyStrong">Save current as preset</Txt>
              </PressableScale>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function BandSlider({ band }: { band: EqBand }) {
  const range = band.maxDb - band.minDb;
  const steps = Math.max(1, Math.round(range / GAIN_STEP));
  const ratio = range > 0 ? (band.gainDb - band.minDb) / range : 0.5;
  const db = band.gainDb;
  const label = `${db > 0 ? '+' : ''}${db.toFixed(1)}`;

  return (
    <View style={styles.band}>
      <Txt variant="mono" tone={db === 0 ? 'tertiary' : 'primary'}>
        {label}
      </Txt>
      <View style={styles.bandSlider}>
        <Slider
          vertical
          value={ratio}
          steps={steps}
          thickness={4}
          onChange={(r) => setBandGain(band.index, band.minDb + r * range)}
          label={`${formatHz(band.centerHz)} hertz band`}
          valueText={`${label} decibels`}
        />
      </View>
      <Txt variant="mono" tone="secondary">
        {formatHz(band.centerHz)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.card },
  flex: { flex: 1 },
  section: { gap: space.md },
  presets: { gap: space.sm, paddingRight: layout.gutter },
  bands: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    borderRadius: radius.card,
    height: 340,
  },
  zeroLine: { position: 'absolute', left: space.lg, right: space.lg, top: '50%', height: StyleSheet.hairlineWidth },
  band: { alignItems: 'center', gap: space.sm, flex: 1 },
  bandSlider: { flex: 1, alignItems: 'center' },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { flex: 1, height: 48, borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: 0 },
  primary: { minHeight: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
