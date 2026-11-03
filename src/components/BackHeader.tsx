import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { space } from '../theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export function BackHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.iconButton}>
        <Icon name="arrow-left" size={24} />
      </PressableScale>
      <Txt variant="title" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Txt>
    </View>
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
  title: { flex: 1 },
});
