import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { isBuildCorrect } from '../lib/exercises';
import { makeRng, shuffle } from '../lib/rng';
import type { BuildExercise } from '../lib/types';
import { Button } from '../ui/Button';
import { colors } from '../ui/theme';
import { Prompt } from './Prompt';
import { Tile } from './Tile';
import type { ExerciseProps } from './types';
import { useKeys } from './useKeys';

// Build the word / build the sentence: tap tiles in order, tap a placed tile
// to send it back. Tiles are tracked by index because words can repeat a
// letter (ગગન has two ગ).
export function BuildView({ ex, answered, onAnswered }: ExerciseProps<BuildExercise>) {
  const tiles = useMemo(() => shuffle(ex.tiles, makeRng(ex.id)), [ex.id, ex.tiles]);
  const [placed, setPlaced] = useState<number[]>([]);
  const isWord = ex.kind === 'build-word';

  const check = () => {
    if (!placed.length || answered) return;
    const chosen = placed.map((i) => tiles[i]);
    onAnswered({
      correct: isBuildCorrect(ex, chosen),
      solution: ex.answer.join(isWord ? '' : ' '),
      solutionIsGujarati: ex.tilesAreGujarati,
    });
  };

  useKeys((k) => {
    if (answered) return;
    if (k === 'Enter') check();
    if (k === 'Backspace') setPlaced((p) => p.slice(0, -1));
  });

  return (
    <View style={styles.wrap}>
      <Prompt
        text={ex.prompt}
        gujarati={ex.promptIsGujarati}
        translit={ex.promptTranslit}
        hint={ex.translitHint}
      />
      <View style={styles.answer}>
        {placed.map((i, n) => (
          <Tile
            key={`${i}-${n}`}
            label={tiles[i]}
            gujarati={ex.tilesAreGujarati}
            size="sm"
            disabled={answered}
            onPress={() => setPlaced((p) => p.filter((x) => x !== i))}
          />
        ))}
      </View>
      <View style={styles.bank}>
        {tiles.map((t, i) => (
          <Tile
            key={i}
            label={t}
            gujarati={ex.tilesAreGujarati}
            size="sm"
            state={placed.includes(i) ? 'ghost' : 'idle'}
            disabled={answered}
            onPress={() => setPlaced((p) => [...p, i])}
          />
        ))}
      </View>
      {!answered && <Button label="Check" onPress={check} disabled={!placed.length} style={styles.check} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 18 },
  answer: {
    minHeight: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.line,
    alignItems: 'flex-end',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  check: { marginTop: 'auto' },
});
