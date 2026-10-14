import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { makeRng, shuffle } from '../lib/rng';
import type { MatchExercise } from '../lib/types';
import { buzz } from '../ui/feedback';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';
import { Tile, type TileState } from './Tile';
import type { ExerciseProps } from './types';

type Side = 'left' | 'right';

// Tap one from each column. A wrong pair flashes red and counts against the
// Gujarati item, then you keep going until everything is matched.
export function MatchView({ ex, answered, onAnswered }: ExerciseProps<MatchExercise>) {
  const rng = useMemo(() => makeRng(ex.id), [ex.id]);
  const left = useMemo(() => shuffle(ex.pairs, rng), [ex.pairs, rng]);
  const right = useMemo(() => shuffle(ex.pairs, rng), [ex.pairs, rng]);
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const missed = useRef(new Set<string>());
  const rightIsLatin = ex.pairs.every((p) => !/[\u0A80-\u0AFF]/.test(p.right));

  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 450);
    return () => clearTimeout(t);
  }, [wrong]);

  useEffect(() => {
    if (matched.length === ex.pairs.length && !answered) {
      const m = [...missed.current];
      onAnswered({ correct: m.length === 0, missed: m });
    }
  }, [matched, ex.pairs.length, answered, onAnswered]);

  const tap = (side: Side, id: string) => {
    if (answered || matched.includes(id)) return;
    if (!sel || sel.side === side) {
      setSel({ side, id });
      return;
    }
    const l = side === 'left' ? id : sel.id;
    const r = side === 'right' ? id : sel.id;
    // Pairs are matched by meaning, not by id, in case two items share an answer.
    const ok = l === r || ex.pairs.find((p) => p.itemId === l)?.right === ex.pairs.find((p) => p.itemId === r)?.right;
    if (ok) {
      setMatched((m) => [...m, l]);
    } else {
      missed.current.add(l);
      setWrong({ left: l, right: r });
      buzz(false);
    }
    setSel(null);
  };

  const stateOf = (side: Side, id: string): TileState => {
    if (matched.includes(id)) return 'done';
    if (wrong && wrong[side] === id) return 'wrong';
    if (sel?.side === side && sel.id === id) return 'selected';
    return 'idle';
  };

  return (
    <View style={styles.wrap}>
      <Text weight="bold" style={styles.help}>
        Tap the matching pairs
      </Text>
      <View style={styles.cols}>
        <View style={styles.col}>
          {left.map((p) => (
            <Tile key={p.itemId} label={p.left} gujarati state={stateOf('left', p.itemId)} onPress={() => tap('left', p.itemId)} />
          ))}
        </View>
        <View style={styles.col}>
          {right.map((p) => (
            <Tile
              key={p.itemId}
              label={p.right}
              gujarati={!rightIsLatin}
              state={stateOf('right', p.itemId)}
              onPress={() => tap('right', p.itemId)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 14 },
  help: { color: colors.muted, textAlign: 'center' },
  cols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 10 },
});
