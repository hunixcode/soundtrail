import { StyleSheet, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { IslandNav } from '../../components/IslandNav';
import { NowPlayingPanel } from '../../components/NowPlayingPanel';
import { TAB_HREF } from '../../state/nav';
import { useColors } from '../../theme/useTheme';

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <View style={styles.row}>
        <TabSlot style={{ flex: 1 }} />
        <NowPlayingPanel />
      </View>
      <TabList style={styles.hidden}>
        <TabTrigger name="library" href={TAB_HREF.library} />
        <TabTrigger name="player" href={TAB_HREF.player} />
        <TabTrigger name="speed" href={TAB_HREF.speed} />
        <TabTrigger name="equalizer" href={TAB_HREF.equalizer} />
      </TabList>
      <IslandNav />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  row: { flex: 1, flexDirection: 'row' },
});
