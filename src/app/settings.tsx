import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Chip } from '../components/Chip';
import { Icon, type IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { clearLibraryCache, resetEqualizer, resetSpeed, setTheme, useApp } from '../state/app';
import type { ThemePreference } from '../state/prefs';
import { useColors } from '../theme/useTheme';
import { layout, radius, space } from '../theme/tokens';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

export default function SettingsScreen() {
  const theme = useApp((s) => s.prefs.theme);

  const confirm = (title: string, body: string, action: () => unknown) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void action() },
    ]);

  return (
    <Screen>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.iconButton}>
          <Icon name="arrow-left" size={24} />
        </PressableScale>
        <Txt variant="title" accessibilityRole="header">
          Settings
        </Txt>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <Txt variant="label" tone="secondary">
            Appearance
          </Txt>
          <View style={styles.chips}>
            {THEMES.map((t) => (
              <Chip key={t.id} label={t.label} selected={theme === t.id} onPress={() => setTheme(t.id)} />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <Txt variant="label" tone="secondary">
            Sound
          </Txt>
          <Row
            icon="sliders"
            title="Reset equalizer"
            body="Turn the equalizer off and set every band to 0 dB."
            onPress={() => confirm('Reset equalizer', 'Your saved presets are kept.', resetEqualizer)}
          />
          <Row
            icon="fast-forward"
            title="Reset speed"
            body="Set playback speed back to 1.00x."
            onPress={() => confirm('Reset speed', 'Playback speed goes back to 1.00x.', resetSpeed)}
          />
        </View>

        <View style={styles.group}>
          <Txt variant="label" tone="secondary">
            Library
          </Txt>
          <Row
            icon="refresh-cw"
            title="Clear library cache"
            body="Remove cached artwork and scan the device again."
            onPress={() => confirm('Clear library cache', 'Artwork will be loaded again from your files.', clearLibraryCache)}
          />
        </View>

        <View style={styles.footer}>
          <Txt variant="mono" tone="tertiary">
            soundtrail {Constants.expoConfig?.version ?? ''}
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <PressableScale onPress={onPress} style={[styles.row, { backgroundColor: colors.bgRaised }]}>
      <Icon name={icon} size={20} />
      <View style={styles.rowText}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="caption" tone="secondary">
          {body}
        </Txt>
      </View>
      <Icon name="chevron-right" size={18} color="fgTertiary" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: layout.gutter, gap: space.xl, paddingBottom: space.xxxl },
  group: { gap: space.md },
  chips: { flexDirection: 'row', gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    minHeight: 64,
  },
  rowText: { flex: 1, gap: 2 },
  footer: { alignItems: 'center', paddingTop: space.lg },
});
