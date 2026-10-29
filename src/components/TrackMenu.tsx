import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LibraryItem } from '../../modules/soundtrail-audio';
import { subtitle } from '../library/format';
import { MOVE_FOLDERS, deleteTrack, enqueue, isDeviceFile, moveTrack, renameTrack } from '../state/app';
import { useColors } from '../theme/useTheme';
import { layout, radius, space, type } from '../theme/tokens';
import { Artwork } from './Artwork';
import { Chip } from './Chip';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

type Mode = 'actions' | 'rename' | 'move';

export function TrackMenu({ item, onClose }: { item: LibraryItem | null; onClose: () => void }) {
  return (
    <Modal visible={item !== null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {item ? <Sheet key={item.id} item={item} onClose={onClose} /> : null}
    </Modal>
  );
}

function Sheet({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('actions');
  const [name, setName] = useState(item.title);
  const device = isDeviceFile(item);

  const run = (action: () => unknown) => {
    onClose();
    action();
  };

  return (
    <KeyboardAvoidingView behavior="height" style={styles.root}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View
        entering={SlideInDown.duration(250)}
        style={[styles.sheet, { backgroundColor: colors.bgRaised, paddingBottom: insets.bottom + space.lg }]}
      >
        <View style={styles.header}>
          <Artwork item={item} size={48} />
          <View style={styles.headerText}>
            <Txt variant="bodyStrong" numberOfLines={1}>
              {item.title}
            </Txt>
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              {subtitle(item)}
            </Txt>
          </View>
        </View>

        {mode === 'actions' ? (
          <Animated.View key="actions" entering={FadeIn.duration(150)}>
            <Action icon="corner-down-right" label="Play next" onPress={() => run(() => enqueue(item, true))} />
            <Action icon="list" label="Add to queue" onPress={() => run(() => enqueue(item, false))} />
            {device ? (
              <>
                <Action icon="edit-2" label="Rename" onPress={() => setMode('rename')} />
                <Action icon="folder" label="Move to…" onPress={() => setMode('move')} />
                <Action icon="trash-2" label="Delete" onPress={() => run(() => deleteTrack(item))} />
              </>
            ) : null}
          </Animated.View>
        ) : mode === 'rename' ? (
          <Animated.View key="rename" entering={FadeIn.duration(150)} style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              selectTextOnFocus
              maxLength={120}
              returnKeyType="done"
              onSubmitEditing={() => run(() => renameTrack(item, name))}
              accessibilityLabel="New name"
              style={[type.body, styles.input, { color: colors.fgPrimary, backgroundColor: colors.bgSunken }]}
            />
            <View style={styles.buttons}>
              <PressableScale onPress={() => setMode('actions')} style={styles.secondary}>
                <Txt variant="bodyStrong" tone="secondary">
                  Back
                </Txt>
              </PressableScale>
              <PressableScale
                onPress={() => run(() => renameTrack(item, name))}
                disabled={!name.trim()}
                style={[styles.primary, { backgroundColor: colors.fgPrimary, opacity: name.trim() ? 1 : 0.4 }]}
              >
                <Txt variant="bodyStrong" tone="inverse">
                  Rename
                </Txt>
              </PressableScale>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="move" entering={FadeIn.duration(150)} style={styles.form}>
            <Txt variant="label" tone="secondary">
              Move to folder
            </Txt>
            <View style={styles.folders}>
              {MOVE_FOLDERS.map((folder) => (
                <Chip key={folder} label={folder} selected={false} onPress={() => run(() => moveTrack(item, folder))} />
              ))}
            </View>
            <PressableScale onPress={() => setMode('actions')} style={styles.secondary}>
              <Txt variant="bodyStrong" tone="secondary">
                Back
              </Txt>
            </PressableScale>
          </Animated.View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} hitSlop={0} accessibilityLabel={label} style={styles.action}>
      <Icon name={icon} size={20} />
      <Txt variant="body">{label}</Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.card * 2,
    borderTopRightRadius: radius.card * 2,
    paddingTop: space.lg,
    paddingHorizontal: layout.gutter,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md },
  headerText: { flex: 1, gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 52 },
  form: { gap: space.md, paddingTop: space.sm },
  input: { height: 48, borderRadius: radius.card, paddingHorizontal: space.md, paddingVertical: 0 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  primary: { minHeight: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 48, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  folders: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
