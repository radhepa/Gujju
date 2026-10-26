import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  makeQuestion,
  multiplier,
  newRound,
  nextGlyph,
  points,
  QUICK_MS,
  record,
  RELAXED_ROUND,
  SPRINT_MS,
  type Glyph,
  type Question,
  type QuestionContext,
  type RoundState,
} from '../lib/letters';
import type { CardRow } from '../lib/types';
import { Kesar } from '../mascot/Kesar';
import { useKeys } from '../session/useKeys';
import { Button } from '../ui/Button';
import { Combo } from '../ui/Combo';
import { buzz } from '../ui/feedback';
import { Screen } from '../ui/Screen';
import { Speak } from '../ui/Speak';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';

const native = Platform.OS !== 'web';
const isGu = (s: string) => /[઀-૿]/.test(s);
// How long a right or wrong answer stays on screen in a sprint.
const RIGHT_MS = 280;
const WRONG_MS = 1300;

export interface SprintResult {
  score: number;
  right: number;
  wrong: number;
  bestCombo: number;
  round: RoundState;
}

interface Feedback {
  chosen: string;
  correct: boolean;
  gained: number;
  quick: boolean;
}

// One round of the letter challenge. Timed: as many as you can in a minute,
// with combos. Untimed: twenty, with the notes on anything you miss.
export function LetterSprint({
  title,
  pool,
  ctx,
  rows,
  timed,
  best,
  onFinish,
  onClose,
}: {
  title: string;
  pool: string[];
  ctx: QuestionContext;
  rows: Map<string, CardRow>;
  timed: boolean;
  best: number;
  onFinish: (r: SprintResult) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'count' | 'play'>(timed ? 'count' : 'play');
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(newRound);
  const [question, setQuestion] = useState<Question>(() => ask(pool, round, rows, ctx));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [left, setLeft] = useState(SPRINT_MS);
  const shownAt = useRef(Date.now());
  const endsAt = useRef(0);
  const done = useRef(false);
  const tally = useRef({ right: 0, wrong: 0 });

  // 3, 2, 1, go.
  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) {
      endsAt.current = Date.now() + SPRINT_MS;
      shownAt.current = Date.now();
      setPhase('play');
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 650);
    return () => clearTimeout(t);
  }, [phase, count]);

  const finish = useCallback(
    (r: RoundState, s: number, bc: number) => {
      if (done.current) return;
      done.current = true;
      onFinish({ score: s, right: tally.current.right, wrong: tally.current.wrong, bestCombo: bc, round: r });
    },
    [onFinish],
  );

  // The clock. Time runs out between questions, never under a tap.
  useEffect(() => {
    if (!timed || phase !== 'play') return;
    const t = setInterval(() => setLeft(Math.max(0, endsAt.current - Date.now())), 100);
    return () => clearInterval(t);
  }, [timed, phase]);
  useEffect(() => {
    if (timed && phase === 'play' && left === 0 && !feedback) finish(round, score, bestCombo);
  }, [timed, phase, left, feedback, round, score, bestCombo, finish]);

  const advance = useCallback(
    (r: RoundState) => {
      setFeedback(null);
      if (!timed && r.asked >= RELAXED_ROUND) return finish(r, score, bestCombo);
      if (timed && Date.now() >= endsAt.current) return finish(r, score, bestCombo);
      setQuestion(ask(pool, r, rows, ctx));
      shownAt.current = Date.now();
    },
    [timed, pool, rows, ctx, score, bestCombo, finish],
  );

  const choose = (chosen: string) => {
    if (feedback || phase !== 'play') return;
    const ms = Date.now() - shownAt.current;
    const correct = chosen === question.answer;
    buzz(correct);
    const nextCombo = correct ? combo + 1 : 0;
    const gained = correct ? points(nextCombo, ms) : 0;
    const r = record(round, question.glyphId, correct, ms, correct ? undefined : chosen);
    tally.current[correct ? 'right' : 'wrong']++;
    setRound(r);
    setCombo(nextCombo);
    setBestCombo((b) => Math.max(b, nextCombo));
    setScore((s) => s + gained);
    setFeedback({ chosen, correct, gained, quick: correct && ms <= QUICK_MS });
  };

  // Sprints move on by themselves; an untimed miss waits for Continue.
  useEffect(() => {
    if (!feedback || (!timed && !feedback.correct)) return;
    const t = setTimeout(() => advance(round), feedback.correct ? RIGHT_MS : WRONG_MS);
    return () => clearTimeout(t);
  }, [feedback, timed, round, advance]);

  useKeys((k) => {
    if (feedback && !feedback.correct && !timed && k === 'Enter') return advance(round);
    const n = Number(k);
    if (n >= 1 && n <= question.options.length) choose(question.options[n - 1]);
  });

  const glyph = ctx.byId.get(question.glyphId)!;
  const x = multiplier(combo);

  if (phase === 'count') {
    return (
      <Screen scroll={false}>
        <View style={styles.countWrap}>
          <Kesar size={140} pose="think" />
          <Text weight="black" style={styles.countTitle}>
            {title}
          </Text>
          <Text style={styles.muted}>{best ? `Your best: ${best}` : 'As many as you can in a minute'}</Text>
          <Text weight="black" style={styles.count}>
            {count || 'Go!'}
          </Text>
        </View>
      </Screen>
    );
  }

  const progress = timed ? left / SPRINT_MS : round.asked / RELAXED_ROUND;
  const low = timed && left < 10_000;

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityLabel="Quit" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.locked} />
        </Pressable>
        <View style={styles.bar}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(Math.min(progress, 1), 0.01) * 100}%`, backgroundColor: timed ? (low ? colors.red : colors.primary) : colors.green },
            ]}
          />
        </View>
        {timed ? (
          <Text weight="black" style={[styles.clock, low && { color: colors.red }]}>
            {Math.ceil(left / 1000)}s
          </Text>
        ) : null}
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text weight="black" style={styles.score}>
            {score}
          </Text>
          {x > 1 ? (
            <View style={styles.mult}>
              <Text weight="black" style={styles.multText}>
                ×{x}
              </Text>
            </View>
          ) : null}
          {feedback?.correct ? <Gain key={round.asked} points={feedback.gained} quick={feedback.quick} /> : null}
        </View>
        <Combo count={combo} />
      </View>

      <View style={styles.body}>
        <Text weight="bold" style={styles.kicker}>
          {question.kind === 'read' ? 'How do you read it?' : 'Which one is it?'}
        </Text>
        <View style={styles.prompt}>
          {question.kind === 'read' ? (
            <Gu style={styles.promptGu}>{question.prompt}</Gu>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text weight="black" style={styles.promptSound}>
                {question.prompt}
              </Text>
              {question.promptSub ? <Text style={styles.muted}>{question.promptSub}</Text> : null}
            </View>
          )}
          <View style={styles.speak}>
            <Speak text={question.say} framed />
          </View>
        </View>

        <View style={styles.grid}>
          {question.options.map((o, i) => {
            const state = !feedback ? 'idle' : o === question.answer ? 'correct' : o === feedback.chosen ? 'wrong' : 'dim';
            return <Option key={`${question.id}:${o}`} label={o} badge={String(i + 1)} state={state} onPress={() => choose(o)} />;
          })}
        </View>
      </View>

      {feedback && !feedback.correct ? (
        <Miss question={question} glyph={glyph} chosen={feedback.chosen} timed={timed} onContinue={() => advance(round)} />
      ) : null}
    </Screen>
  );
}

function ask(pool: string[], round: RoundState, rows: Map<string, CardRow>, ctx: QuestionContext): Question {
  const id = nextGlyph(pool, round, rows, ctx.rng);
  return makeQuestion(ctx.byId.get(id)!, ctx, round.asked);
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

const look: Record<OptionState, { bg: string; border: string; fg: string }> = {
  idle: { bg: colors.card, border: colors.lineDark, fg: colors.ink },
  correct: { bg: colors.greenSoft, border: colors.green, fg: colors.greenDark },
  wrong: { bg: colors.redSoft, border: colors.red, fg: colors.redDark },
  dim: { bg: colors.card, border: colors.line, fg: colors.locked },
};

// An answer button. A wrong pick gives a little shake.
function Option({ label, badge, state, onPress }: { label: string; badge: string; state: OptionState; onPress: () => void }) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== 'wrong') return;
    Animated.sequence(
      [8, -8, 6, -6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: native })),
    ).start();
  }, [state, shake]);
  const l = look[state];
  const gu = isGu(label);
  return (
    <Animated.View style={[styles.cell, { transform: [{ translateX: shake }] }]}>
      <Pressable
        onPress={onPress}
        disabled={state !== 'idle'}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.option,
          { backgroundColor: l.bg, borderColor: l.border, borderBottomWidth: pressed ? 2 : 4, marginTop: pressed ? 2 : 0 },
        ]}
      >
        <Text weight="bold" style={styles.badge}>
          {badge}
        </Text>
        {gu ? (
          <Gu style={[styles.optionGu, { color: l.fg }]}>{label}</Gu>
        ) : (
          <Text weight="black" style={[styles.optionText, { color: l.fg }]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// "+25 Quick!" floating up from the score.
function Gain({ points: n, quick }: { points: number; quick: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 700, useNativeDriver: native }).start();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.gain,
        {
          opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }],
        },
      ]}
    >
      <Text weight="black" style={styles.gainText}>
        +{n}
        {quick ? ' Quick!' : ''}
      </Text>
    </Animated.View>
  );
}

// What went wrong: the letter you were asked about next to the one you
// picked, so the difference sinks in.
function Miss({ question, glyph, chosen, timed, onContinue }: { question: Question; glyph: Glyph; chosen: string; timed: boolean; onContinue: () => void }) {
  const read = question.kind === 'read';
  const target = read ? { shape: question.prompt, sound: question.answer } : { shape: question.answer, sound: question.prompt };
  const picked = read ? { shape: question.other[chosen], sound: chosen } : { shape: chosen, sound: question.other[chosen] };
  return (
    <View style={styles.sheet}>
      <View style={styles.pairRow}>
        <Pair shape={target.shape} sound={target.sound} good />
        <Text weight="black" style={styles.vs}>
          not
        </Text>
        <Pair shape={picked.shape} sound={picked.sound} />
      </View>
      {!timed && glyph.item.notes ? <Text style={styles.notes}>{glyph.item.notes}</Text> : null}
      {!timed ? <Button label="Continue" variant="red" onPress={onContinue} /> : null}
    </View>
  );
}

function Pair({ shape, sound, good }: { shape: string; sound: string; good?: boolean }) {
  return (
    <View style={[styles.pair, { borderColor: good ? colors.green : colors.red }]}>
      <Gu style={[styles.pairGu, { color: good ? colors.greenDark : colors.redDark }]}>{shape}</Gu>
      <Text weight="bold" style={styles.pairSound}>
        {sound}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  countWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  countTitle: { fontSize: 24, textAlign: 'center' },
  count: { fontSize: 72, color: colors.primary, marginTop: 12 },
  muted: { color: colors.muted, fontSize: 15 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 8 },
  bar: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  clock: { fontSize: 16, color: colors.muted, minWidth: 34, textAlign: 'right' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  score: { fontSize: 28, color: colors.primaryDark },
  mult: { backgroundColor: colors.teal, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
  multText: { color: '#fff', fontSize: 14 },
  gain: { position: 'absolute', left: 0, top: -18, width: 160 },
  gainText: { color: colors.green, fontSize: 16 },
  body: { flex: 1, gap: 10, paddingTop: 6 },
  kicker: { color: colors.primaryDark, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  prompt: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
  },
  promptGu: { fontSize: 92, lineHeight: 150, color: colors.ink },
  promptSound: { fontSize: 52, color: colors.teal },
  speak: { position: 'absolute', right: 10, top: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  cell: { width: '47%', flexGrow: 1 },
  option: { borderWidth: 2, borderRadius: 16, minHeight: 88, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  badge: { position: 'absolute', top: 6, left: 9, fontSize: 11, color: colors.locked },
  optionGu: { fontSize: 40, lineHeight: 62 },
  optionText: { fontSize: 24 },
  sheet: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 10, backgroundColor: colors.redSoft },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  vs: { color: colors.redDark, fontSize: 15 },
  pair: { alignItems: 'center', borderWidth: 2, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 2, minWidth: 90 },
  pairGu: { fontSize: 38, lineHeight: 58 },
  pairSound: { fontSize: 16, color: colors.ink, marginTop: -4, marginBottom: 6 },
  notes: { fontSize: 14, color: colors.ink, lineHeight: 20 },
});
