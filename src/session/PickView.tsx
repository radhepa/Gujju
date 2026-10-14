import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { makeRng, shuffle } from '../lib/rng';
import type { PickExercise } from '../lib/types';
import { Button } from '../ui/Button';
import { Prompt } from './Prompt';
import { Tile, type TileState } from './Tile';
import type { ExerciseProps } from './types';
import { useKeys } from './useKeys';

export function PickView({ ex, answered, onAnswered }: ExerciseProps<PickExercise>) {
  // Retries reshuffle, so you can't just remember "it was the top-left one".
  const options = useMemo(() => shuffle(ex.options, makeRng(ex.id)), [ex.id, ex.options]);
  const [chosen, setChosen] = useState<string | null>(null);

  const check = () => {
    if (!chosen || answered) return;
    onAnswered({ correct: chosen === ex.answer, solution: ex.answer, solutionIsGujarati: ex.optionsAreGujarati });
  };

  useKeys((k) => {
    if (answered) return;
    const n = Number(k);
    if (n >= 1 && n <= options.length) setChosen(options[n - 1]);
    if (k === 'Enter') check();
  });

  const stateOf = (o: string): TileState => {
    if (!answered) return o === chosen ? 'selected' : 'idle';
    if (o === ex.answer) return 'correct';
    if (o === chosen) return 'wrong';
    return 'idle';
  };

  return (
    <View style={styles.wrap}>
      <Prompt
        text={ex.prompt}
        gujarati={ex.kind === 'pick-sound'}
        big={ex.kind === 'pick-sound'}
        translit={ex.promptTranslit}
        hint={ex.translitHint}
      />
      <View style={styles.grid}>
        {options.map((o, i) => (
          <Tile
            key={o}
            label={o}
            gujarati={ex.optionsAreGujarati}
            size="lg"
            badge={String(i + 1)}
            state={stateOf(o)}
            disabled={answered}
            onPress={() => setChosen(o)}
            style={styles.cell}
          />
        ))}
      </View>
      {!answered && <Button label="Check" onPress={check} disabled={!chosen} style={styles.check} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
  check: { marginTop: 'auto' },
});
