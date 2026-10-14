import { StyleSheet, View } from 'react-native';
import type { IntroExercise } from '../lib/types';
import { Button } from '../ui/Button';
import { Gu, Text } from '../ui/Text';
import { colors, shadow } from '../ui/theme';
import type { ExerciseProps } from './types';
import { useKeys } from './useKeys';

const label = { letter: 'New letter', number: 'New number', word: 'New word', sentence: 'New sentence' };

// Shown once before a new item is tested, so a complete beginner isn't
// guessing at a letter they've never seen.
export function IntroView({ ex, onAnswered }: ExerciseProps<IntroExercise>) {
  const it = ex.item;
  const go = () => onAnswered({ correct: true });
  useKeys((k) => k === 'Enter' && go());

  return (
    <View style={styles.wrap}>
      <Text weight="black" style={styles.kicker}>
        {label[it.type]}
      </Text>
      <View style={[styles.card, shadow]}>
        <Gu style={styles.gu}>{it.gujarati}</Gu>
        <Text weight="black" style={styles.translit}>
          {it.translit}
        </Text>
        {it.english && it.type !== 'number' ? <Text style={styles.english}>{it.english}</Text> : null}
        {it.notes ? <Text style={styles.notes}>{it.notes}</Text> : null}
      </View>
      <Button label="Got it" onPress={go} style={styles.go} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 16 },
  kicker: { color: colors.teal, textTransform: 'uppercase', letterSpacing: 1, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  gu: { fontSize: 96, lineHeight: 150 },
  translit: { fontSize: 30, color: colors.primaryDark },
  english: { fontSize: 18 },
  notes: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  go: { marginTop: 'auto' },
});
