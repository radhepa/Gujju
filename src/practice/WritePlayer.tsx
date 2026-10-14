import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { splitAksharas } from '../lib/aksharas';
import { makeRng } from '../lib/rng';
import { gradeFor, XP_PER_EXERCISE, type Summary } from '../lib/session';
import { normGu } from '../lib/text';
import type { Item, WriteMode } from '../lib/types';
import { backspace, KEYBOARD, letterTiles, writeCardId } from '../lib/write';
import { Kesar } from '../mascot/Kesar';
import { useKeys } from '../session/useKeys';
import { Button } from '../ui/Button';
import { buzz } from '../ui/feedback';
import { Screen } from '../ui/Screen';
import { Speak } from '../ui/Speak';
import { Gu, Text } from '../ui/Text';
import { colors, shadow } from '../ui/theme';

// One round of writing practice: the meaning is shown, the learner builds
// the Gujarati from letter tiles or types it on a Gujarati keyboard.
export function WritePlayer({
  words,
  mode,
  onMode,
  onFinish,
  onClose,
}: {
  words: Item[];
  mode: WriteMode;
  onMode: (m: WriteMode) => void;
  onFinish: (s: Summary) => void;
  onClose: () => void;
}) {
  const [queue, setQueue] = useState(words);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [showTr, setShowTr] = useState(false);
  const misses = useRef<Record<string, number>>({});
  const firstTry = useRef<Record<string, boolean>>({});

  const word = queue[index];
  const tiles = useMemo(() => (word ? letterTiles(word.gujarati, makeRng(`${word.id}:${index}`)) : []), [word, index]);
  const built = mode === 'tiles' ? picked.map((i) => tiles[i]).join('') : typed;

  const id = word ? writeCardId(word.id) : '';

  const miss = () => {
    misses.current[id] = (misses.current[id] ?? 0) + 1;
    if (!(id in firstTry.current)) firstTry.current[id] = false;
  };

  const check = () => {
    if (!word || !built || answered !== null) return;
    const ok = normGu(built) === normGu(word.gujarati);
    buzz(ok);
    if (!(id in firstTry.current)) firstTry.current[id] = ok;
    if (!ok) {
      misses.current[id] = (misses.current[id] ?? 0) + 1;
      setQueue((q) => [...q, word]);
    }
    setAnswered(ok);
  };

  const hint = () => {
    if (!word) return;
    // The next correct letter, at the cost of a miss.
    miss();
    const target = splitAksharas(word.gujarati);
    if (mode === 'tiles') {
      const have = picked.map((i) => tiles[i]);
      const n = have.findIndex((a, i) => a !== target[i]);
      const keep = n < 0 ? have.length : n;
      const nextA = target[keep];
      const base = picked.slice(0, keep);
      const tileIndex = tiles.findIndex((t, i) => t === nextA && !base.includes(i));
      if (tileIndex >= 0) setPicked([...base, tileIndex]);
    } else {
      const have = splitAksharas(typed);
      const n = have.findIndex((a, i) => a !== target[i]);
      const keep = n < 0 ? Math.min(have.length, target.length) : n;
      setTyped(target.slice(0, keep + 1).join(''));
    }
  };

  const next = () => {
    if (answered === null) return;
    setAnswered(null);
    setPicked([]);
    setTyped('');
    setShowTr(false);
    if (index + 1 >= queue.length) {
      const ids = [...new Set(queue.map((w) => writeCardId(w.id)))];
      const right = ids.filter((x) => firstTry.current[x]).length;
      onFinish({
        xp: right * XP_PER_EXERCISE,
        correctFirstTry: right,
        total: ids.length,
        accuracy: ids.length ? right / ids.length : 1,
        grades: Object.fromEntries(ids.map((x) => [x, gradeFor(misses.current[x] ?? 0)])),
      });
      return;
    }
    setIndex((i) => i + 1);
  };

  useKeys((k) => {
    if (k === 'Enter') (answered === null ? check : next)();
    if (k === 'Backspace' && answered === null) {
      if (mode === 'tiles') setPicked((p) => p.slice(0, -1));
      else setTyped((t) => backspace(t));
    }
  });

  if (!word) return <Screen scroll={false}>{null}</Screen>;
  const progress = Object.keys(firstTry.current).length / words.length;

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityLabel="Quit" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.locked} />
        </Pressable>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${Math.max(Math.min(progress, 1), 0.02) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <Text weight="bold" style={styles.kicker}>
          Write it in Gujarati
        </Text>
        <View style={styles.promptRow}>
          <Text weight="black" style={styles.prompt}>
            {word.english}
          </Text>
          <Speak text={word.gujarati} />
        </View>
        <Pressable onPress={() => setShowTr((v) => !v)} accessibilityRole="button">
          <Text style={styles.trHint}>{showTr ? word.translit : 'Show how it sounds'}</Text>
        </Pressable>

        <View
          style={[
            styles.answer,
            answered === true && { borderColor: colors.green, backgroundColor: colors.greenSoft },
            answered === false && { borderColor: colors.red, backgroundColor: colors.redSoft },
          ]}
        >
          <Gu style={styles.answerText}>{built || ' '}</Gu>
          {answered === null && built ? (
            <Pressable
              onPress={() => (mode === 'tiles' ? setPicked((p) => p.slice(0, -1)) : setTyped((t) => backspace(t)))}
              accessibilityLabel="Delete"
              hitSlop={10}
            >
              <Ionicons name="backspace-outline" size={26} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {answered === null && mode === 'tiles' && (
          <View style={styles.tiles}>
            {tiles.map((t, i) => {
              const used = picked.includes(i);
              return (
                <Pressable
                  key={i}
                  disabled={used}
                  onPress={() => setPicked((p) => [...p, i])}
                  style={[styles.tile, shadow, used && styles.tileUsed]}
                  accessibilityRole="button"
                  accessibilityLabel={t}
                >
                  <Gu style={[styles.tileText, used && { color: colors.line }]}>{t}</Gu>
                </Pressable>
              );
            })}
          </View>
        )}

        {answered === null && mode === 'keyboard' && <Keyboard onKey={(k) => setTyped((t) => t + k)} />}

        {answered === null && (
          <View style={styles.row}>
            <Pressable onPress={hint} style={styles.link} accessibilityRole="button">
              <Ionicons name="bulb-outline" size={16} color={colors.teal} />
              <Text weight="bold" style={styles.linkText}>
                Hint
              </Text>
            </Pressable>
            <Pressable onPress={() => onMode(mode === 'tiles' ? 'keyboard' : 'tiles')} style={styles.link} accessibilityRole="button">
              <Ionicons name={mode === 'tiles' ? 'keypad-outline' : 'grid-outline'} size={16} color={colors.teal} />
              <Text weight="bold" style={styles.linkText}>
                {mode === 'tiles' ? 'Use the Gujarati keyboard' : 'Use letter tiles'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {answered === null ? (
        <Button label="Check" onPress={check} disabled={!built} style={{ marginBottom: 16 }} />
      ) : (
        <View style={[styles.sheet, { backgroundColor: answered ? colors.greenSoft : colors.redSoft }]}>
          <View style={styles.sheetRow}>
            <Kesar size={70} reaction={answered ? 'nod' : 'oops'} reactionKey={index} tappable={false} />
            <View style={{ flex: 1 }}>
              <Text weight="black" style={[styles.verdict, { color: answered ? colors.greenDark : colors.redDark }]}>
                {answered ? 'Nice!' : 'It’s written:'}
              </Text>
              {!answered ? (
                <>
                  <Gu style={styles.solution}>{word.gujarati}</Gu>
                  <Text style={styles.parts}>
                    {splitAksharas(word.gujarati).join(' + ')}  ·  {word.translit}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <Button label="Continue" variant={answered ? 'green' : 'red'} onPress={next} />
        </View>
      )}
    </Screen>
  );
}

function Keyboard({ onKey }: { onKey: (k: string) => void }) {
  const group = (keys: string[], sign = false) => (
    <View style={styles.keys}>
      {keys.map((k) => (
        <Pressable key={k} onPress={() => onKey(k)} style={({ pressed }) => [styles.key, pressed && styles.keyDown]} accessibilityRole="button" accessibilityLabel={k}>
          <Gu style={styles.keyText}>{sign ? `◌${k}` : k}</Gu>
        </Pressable>
      ))}
    </View>
  );
  return (
    <View style={styles.keyboard}>
      {group(KEYBOARD.signs, true)}
      {group(KEYBOARD.consonants)}
      {group(KEYBOARD.vowels)}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 18 },
  bar: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, backgroundColor: colors.green },
  body: { gap: 12, paddingBottom: 16 },
  kicker: { color: colors.primaryDark, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prompt: { fontSize: 26, flexShrink: 1 },
  trHint: { color: colors.teal, fontSize: 15 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    borderWidth: 2,
    borderColor: colors.lineDark,
    borderRadius: 16,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    gap: 8,
  },
  answerText: { flex: 1, fontSize: 36, lineHeight: 56 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 },
  tile: {
    minWidth: 58,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.lineDark,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tileUsed: { backgroundColor: colors.bg, borderColor: colors.line },
  tileText: { fontSize: 28, lineHeight: 42 },
  keyboard: { gap: 10 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  key: {
    width: 42,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: colors.lineDark,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDown: { backgroundColor: colors.primarySoft },
  keyText: { fontSize: 20, lineHeight: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  linkText: { color: colors.teal, fontSize: 14 },
  sheet: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, gap: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -8 },
  verdict: { fontSize: 20 },
  solution: { fontSize: 30, lineHeight: 46, color: colors.redDark },
  parts: { fontSize: 14, color: colors.muted },
});
