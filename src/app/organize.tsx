import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '../components/BackHeader';
import { Empty } from '../components/Empty';
import { PressableScale } from '../components/PressableScale';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import { planOrganize, type Move } from '../online/organize';
import { isDeviceFile, organizeLibrary, useApp } from '../state/app';
import { useColors } from '../theme/useTheme';
import { layout, radius, space, type } from '../theme/tokens';

type Phase =
  | { step: 'idle' }
  | { step: 'planning'; done: number; total: number }
  | { step: 'review'; moves: Move[] }
  | { step: 'applying'; moves: Move[] }
  | { step: 'done'; count: number }
  | { step: 'error' };

export default function OrganizeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const library = useApp((s) => s.library);
  const [instruction, setInstruction] = useState('');
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const mounted = useRef(true);
  const files = library.filter(isDeviceFile);
  const busy = phase.step === 'planning' || phase.step === 'applying';
  const moves = phase.step === 'review' || phase.step === 'applying' ? phase.moves : [];

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const show = (next: Phase) => mounted.current && setPhase(next);

  const suggest = async () => {
    show({ step: 'planning', done: 0, total: 1 });
    try {
      const plan = await planOrganize(files, instruction, (done, total) => show({ step: 'planning', done, total }));
      show({ step: 'review', moves: plan });
    } catch {
      show({ step: 'error' });
    }
  };

  const apply = async () => {
    show({ step: 'applying', moves });
    show({ step: 'done', count: await organizeLibrary(moves) });
  };

  if (files.length === 0) {
    return (
      <Screen>
        <BackHeader title="Organize" />
        <Empty icon="music" title="No files to organize" body="Open the Library first so soundtrail can read the music on this device." />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Organize" />
      <FlatList
        data={moves}
        keyExtractor={(move) => move.item.id}
        renderItem={({ item: move }) => (
          <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
            <Txt variant="bodyStrong" numberOfLines={1}>
              {move.name}
            </Txt>
            <Txt variant="caption" tone="secondary" numberOfLines={1}>
              {move.folder}
            </Txt>
            <Txt variant="caption" tone="tertiary" numberOfLines={1}>
              {`was ${move.item.folder ?? ''}${move.item.fileName ?? move.item.title}`}
            </Txt>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={14}
        windowSize={7}
        ListHeaderComponent={
          <View style={styles.form}>
            <Txt tone="secondary">
              {`A free AI suggests folders inside Music and cleaner names for your ${files.length} files. Nothing changes until you apply.`}
            </Txt>
            <TextInput
              value={instruction}
              onChangeText={setInstruction}
              editable={!busy}
              placeholder="Optional: how to sort, for example by genre"
              placeholderTextColor={colors.fgTertiary}
              multiline
              maxLength={300}
              accessibilityLabel="How to organize"
              style={[type.body, styles.input, { color: colors.fgPrimary, backgroundColor: colors.bgSunken }]}
            />
            {phase.step === 'review' && moves.length > 0 ? (
              <View style={styles.actions}>
                <Txt tone="secondary" style={styles.grow}>
                  {moves.length === 1 ? '1 change' : `${moves.length} changes`}
                </Txt>
                <Button label="Try again" secondary onPress={suggest} />
                <Button label="Apply" onPress={apply} />
              </View>
            ) : busy ? (
              <View style={styles.actions}>
                <ActivityIndicator color={colors.fgSecondary} />
                <Txt tone="secondary" style={styles.grow}>
                  {phase.step === 'planning'
                    ? `Asking the AI, part ${Math.min(phase.done + 1, phase.total)} of ${phase.total}. The free service answers about once a minute.`
                    : 'Moving files…'}
                </Txt>
              </View>
            ) : (
              <View style={styles.actions}>
                <Txt tone="secondary" style={styles.grow}>
                  {phase.step === 'error'
                    ? 'Could not reach the AI service. Try again in a minute.'
                    : phase.step === 'review'
                      ? 'Everything is already in order.'
                      : phase.step === 'done'
                        ? phase.count === 1
                          ? '1 file organized.'
                          : `${phase.count} files organized.`
                        : ''}
                </Txt>
                <Button label="Suggest" onPress={suggest} />
              </View>
            )}
          </View>
        }
      />
    </Screen>
  );
}

function Button({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.button, secondary ? { borderColor: colors.borderSubtle, borderWidth: 1 } : { backgroundColor: colors.fgPrimary }]}
    >
      <Txt variant="bodyStrong" tone={secondary ? 'primary' : 'inverse'}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.md, paddingHorizontal: layout.gutter, paddingBottom: space.lg },
  input: { minHeight: 48, maxHeight: 120, borderRadius: radius.card, paddingHorizontal: space.md, paddingVertical: space.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  grow: { flex: 1 },
  button: { minHeight: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: {
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: layout.gutter,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
