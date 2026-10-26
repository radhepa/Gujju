import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { course } from '../content/course';
import { current, isFinished, startSession, submit, summarize, type Summary } from '../lib/session';
import type { Exercise } from '../lib/types';
import { Kesar } from '../mascot/Kesar';
import { Button } from '../ui/Button';
import { Combo } from '../ui/Combo';
import { buzz } from '../ui/feedback';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';
import { BuildView } from './BuildView';
import { IntroView } from './IntroView';
import { MatchView } from './MatchView';
import { PickView } from './PickView';
import type { Result } from './types';
import { useKeys } from './useKeys';

export function SessionPlayer({
  exercises,
  onFinish,
  onClose,
}: {
  exercises: Exercise[];
  onFinish: (summary: Summary) => void;
  onClose: () => void;
}) {
  const [session, setSession] = useState(() => startSession(exercises));
  const [result, setResult] = useState<Result | null>(null);
  // Right answers in a row, for the flame by the progress bar.
  const [run, setRun] = useState(0);
  const ex = current(session);

  const finished = useRef(false);
  useEffect(() => {
    if (isFinished(session) && !finished.current) {
      finished.current = true;
      onFinish(summarize(session));
    }
  }, [session, onFinish]);

  const onAnswered = useCallback(
    (r: Result) => {
      if (ex?.kind === 'intro') {
        setSession((s) => submit(s, r));
        return;
      }
      buzz(r.correct);
      setRun((n) => (r.correct ? n + 1 : 0));
      setResult(r);
    },
    [ex?.kind],
  );

  const next = () => {
    if (!result) return;
    setSession((s) => submit(s, { correct: result.correct, missed: result.missed }));
    setResult(null);
  };

  useKeys((k) => k === 'Enter' && next(), !!result);

  if (!ex) return <Screen scroll={false}>{null}</Screen>;

  const props = { answered: !!result, onAnswered };
  const progress = session.total ? session.done / session.total : 0;
  const retry = ex.id.includes('#');
  const notes = result && !result.correct && ex.itemIds.length === 1 ? course.items[ex.itemIds[0]]?.notes : undefined;

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityLabel="Quit" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.locked} />
        </Pressable>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${Math.max(progress, 0.02) * 100}%` }]} />
        </View>
        <Combo count={run} />
      </View>

      {retry && !result ? (
        <Text weight="bold" style={styles.retry}>
          Another go at one you missed
        </Text>
      ) : null}
      {'question' in ex ? (
        <Text weight="black" style={styles.question}>
          {ex.question}
        </Text>
      ) : null}

      <View style={styles.body} key={ex.id}>
        {ex.kind === 'intro' && <IntroView ex={ex} {...props} />}
        {(ex.kind === 'pick-sound' || ex.kind === 'pick-letter') && <PickView ex={ex} {...props} />}
        {ex.kind === 'match-pairs' && <MatchView ex={ex} {...props} />}
        {(ex.kind === 'build-word' || ex.kind === 'build-sentence') && <BuildView ex={ex} {...props} />}
      </View>

      {result && (
        <View style={[styles.sheet, { backgroundColor: result.correct ? colors.greenSoft : colors.redSoft }]}>
          <View style={styles.sheetRow}>
            <Kesar size={76} reaction={result.correct ? 'nod' : 'oops'} reactionKey={session.index} tappable={false} />
            <View style={{ flex: 1 }}>
              <Text weight="black" style={[styles.verdict, { color: result.correct ? colors.greenDark : colors.redDark }]}>
                {result.correct ? (run >= 5 ? `${run} in a row!` : 'Nice!') : ex.kind === 'match-pairs' ? 'Almost. This one comes back later.' : 'Correct answer:'}
              </Text>
              {!result.correct && result.solution ? (
                result.solutionIsGujarati ? (
                  <Gu style={styles.solutionGu}>{result.solution}</Gu>
                ) : (
                  <Text weight="bold" style={styles.solution}>
                    {result.solution}
                  </Text>
                )
              ) : null}
              {notes ? <Text style={styles.notes}>{notes}</Text> : null}
            </View>
          </View>
          <Button label="Continue" variant={result.correct ? 'green' : 'red'} onPress={next} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 18 },
  bar: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, backgroundColor: colors.green },
  retry: { color: colors.primaryDark, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  question: { fontSize: 22, marginBottom: 8 },
  body: { flex: 1, paddingBottom: 16 },
  sheet: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, gap: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -8 },
  verdict: { fontSize: 20 },
  solution: { fontSize: 18, color: colors.redDark },
  solutionGu: { fontSize: 26, lineHeight: 40, color: colors.redDark },
  notes: { fontSize: 14, color: colors.ink, lineHeight: 20, marginBottom: 4 },
});
