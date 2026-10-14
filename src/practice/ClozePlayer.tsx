import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SAVED_BOOK_ID } from '../content/library';
import { lookup } from '../content/practice';
import { answerTranslit, checkTyped, optionsFor, type ClozeCard } from '../lib/cloze';
import { makeRng } from '../lib/rng';
import { gradeFor, XP_PER_EXERCISE, type Summary } from '../lib/session';
import { normGu } from '../lib/text';
import type { Book, ClozeMode } from '../lib/types';
import { Kesar } from '../mascot/Kesar';
import { useKeys } from '../session/useKeys';
import { useProgress } from '../state/progress';
import { Button } from '../ui/Button';
import { buzz } from '../ui/feedback';
import { Screen } from '../ui/Screen';
import { SentenceView } from '../ui/SentenceView';
import { Speak } from '../ui/Speak';
import { Gu, Text } from '../ui/Text';
import { colors, fonts } from '../ui/theme';
import { WordSheet } from '../ui/WordSheet';

interface Answered {
  correct: boolean;
  chosen: string;
}

// One round of sentence practice. A missed sentence comes round again at
// the end of the round; its grade still counts the miss.
export function ClozePlayer({
  cards,
  mode,
  onFinish,
  onClose,
}: {
  cards: ClozeCard[];
  mode: ClozeMode;
  onFinish: (summary: Summary) => void;
  onClose: () => void;
}) {
  const { snapshot, saveBook } = useProgress();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [typed, setTyped] = useState('');
  const [useChoices, setUseChoices] = useState(mode === 'choice');
  const [showTr, setShowTr] = useState(snapshot.settings.alwaysShowTranslit);
  const [word, setWord] = useState<string | null>(null);
  const misses = useRef<Record<string, number>>({});
  const firstTry = useRef<Record<string, boolean>>({});

  const card = queue[index];
  const rng = useMemo(() => makeRng(`${card?.cardId}:${index}`), [card?.cardId, index]);
  const options = useMemo(() => (card ? optionsFor(card, rng) : []), [card, rng]);
  const retry = card ? queue.slice(0, index).some((c) => c.cardId === card.cardId) : false;

  const saved = snapshot.books.find((b) => b.id === SAVED_BOOK_ID);
  const isSaved = !!card && !!saved?.sentences.some((s) => normGu(s.gu) === normGu(card.gu));

  const answer = (chosen: string, correct: boolean) => {
    if (!card || answered) return;
    buzz(correct);
    if (!(card.cardId in firstTry.current)) firstTry.current[card.cardId] = correct;
    if (!correct) {
      misses.current[card.cardId] = (misses.current[card.cardId] ?? 0) + 1;
      setQueue((q) => [...q, card]);
    }
    setAnswered({ correct, chosen });
  };

  const check = () => {
    if (!card || !typed.trim()) return;
    answer(typed.trim(), checkTyped(typed, card, lookup));
  };

  const next = () => {
    if (!answered) return;
    setAnswered(null);
    setTyped('');
    setUseChoices(mode === 'choice');
    if (index + 1 >= queue.length) {
      const ids = [...new Set(queue.map((c) => c.cardId))];
      const right = ids.filter((id) => firstTry.current[id]).length;
      const grades = Object.fromEntries(ids.map((id) => [id, gradeFor(misses.current[id] ?? 0)]));
      onFinish({
        xp: right * XP_PER_EXERCISE,
        correctFirstTry: right,
        total: ids.length,
        accuracy: ids.length ? right / ids.length : 1,
        grades,
      });
      return;
    }
    setIndex((i) => i + 1);
  };

  const toggleSave = () => {
    if (!card) return;
    const now = new Date().toISOString();
    const book: Book = saved ?? {
      id: SAVED_BOOK_ID,
      title: 'My sentences',
      titleGu: 'મારાં વાક્યો',
      builtIn: false,
      createdAt: now,
      blurb: 'Sentences you saved during practice.',
      sentences: [],
    };
    const sentences = isSaved
      ? book.sentences.filter((s) => normGu(s.gu) !== normGu(card.gu))
      : [...book.sentences, { id: `s${Date.now().toString(36)}`, gu: card.gu, tr: card.tr, en: card.en, cloze: card.answer, wrong: card.wrong }];
    saveBook({ ...book, sentences });
    // On the web the button keeps focus, and the Enter that moves on would
    // press it again and un-save the sentence.
    if (Platform.OS === 'web') (document.activeElement as HTMLElement | null)?.blur();
  };

  useKeys(
    (k) => {
      if (answered) {
        if (k === 'Enter') next();
        return;
      }
      if (useChoices && ['1', '2', '3', '4'].includes(k)) {
        const o = options[Number(k) - 1];
        if (o) answer(o, normGu(o) === normGu(card!.answer));
      }
    },
    !!card,
  );

  if (!card) return <Screen scroll={false}>{null}</Screen>;

  const progress = Object.keys(firstTry.current).length / cards.length;
  const tr = answerTranslit(card, lookup);

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Pressable onPress={onClose} accessibilityLabel="Quit" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.locked} />
        </Pressable>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${Math.max(Math.min(progress, 1), 0.02) * 100}%` }]} />
        </View>
        <Pressable onPress={() => setShowTr((v) => !v)} accessibilityLabel="Show transliteration" hitSlop={10}>
          <Ionicons name={showTr ? 'text' : 'text-outline'} size={24} color={showTr ? colors.teal : colors.locked} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text weight="bold" style={styles.kicker}>
          {retry && !answered ? 'Another go at one you missed' : 'Fill the gap'}
        </Text>

        <View style={styles.sentenceRow}>
          <View style={{ flex: 1 }}>
            <SentenceView
              gu={card.gu}
              tr={card.tr}
              showTranslit={showTr || !!answered}
              blank={{ index: card.index, reveal: answered ? { word: card.answer, correct: answered.correct } : undefined }}
              onWord={answered ? setWord : undefined}
            />
          </View>
          {answered ? <Speak text={card.gu} /> : null}
        </View>
        {card.en ? <Text style={styles.en}>{card.en}</Text> : null}

        {!answered && useChoices && (
          <View style={styles.grid}>
            {options.map((o, i) => (
              <Pressable
                key={o}
                onPress={() => answer(o, normGu(o) === normGu(card.answer))}
                style={({ pressed }) => [styles.option, pressed && { opacity: 0.75 }]}
                accessibilityRole="button"
              >
                {Platform.OS === 'web' ? <Text style={styles.key}>{i + 1}</Text> : null}
                <Gu style={styles.optionText}>{o}</Gu>
              </Pressable>
            ))}
          </View>
        )}

        {!answered && !useChoices && (
          <View style={styles.typeBox}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              onSubmitEditing={check}
              placeholder="Type the missing word (ગુજરાતી or English letters)"
              placeholderTextColor={colors.locked}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={styles.input}
              returnKeyType="done"
            />
            <View style={styles.typeRow}>
              <Button label="Check" onPress={check} disabled={!typed.trim()} style={{ flex: 1 }} />
              <Button
                label="Options"
                variant="plain"
                onPress={() => {
                  // Falling back to the options costs a miss, the same as a hint.
                  misses.current[card.cardId] = (misses.current[card.cardId] ?? 0) + 1;
                  firstTry.current[card.cardId] = false;
                  setUseChoices(true);
                }}
              />
            </View>
          </View>
        )}

        {answered && (
          <View style={styles.after}>
            {card.note ? <Text style={styles.note}>{card.note}</Text> : null}
            <Text style={styles.tapHint}>Tap any word to see what it means.</Text>
            <Pressable onPress={toggleSave} style={styles.save} accessibilityRole="button">
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.primaryDark} />
              <Text weight="bold" style={styles.saveText}>
                {isSaved ? 'Saved to My sentences' : 'Save sentence'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {answered && (
        <View style={[styles.sheet, { backgroundColor: answered.correct ? colors.greenSoft : colors.redSoft }]}>
          <View style={styles.sheetRow}>
            <Kesar size={70} reaction={answered.correct ? 'nod' : 'oops'} reactionKey={index} tappable={false} />
            <View style={{ flex: 1 }}>
              <Text weight="black" style={[styles.verdict, { color: answered.correct ? colors.greenDark : colors.redDark }]}>
                {answered.correct ? 'Nice!' : 'The word was:'}
              </Text>
              {!answered.correct ? (
                <Text style={styles.solution}>
                  <Gu style={styles.solutionGu}>{card.answer}</Gu>
                  {tr ? `  ${tr}` : ''}
                </Text>
              ) : null}
              {!answered.correct && answered.chosen ? (
                <Text style={styles.chosen}>
                  You {useChoices ? 'picked' : 'wrote'} <Gu style={styles.chosenGu}>{answered.chosen}</Gu>
                </Text>
              ) : null}
            </View>
          </View>
          <Button label="Continue" variant={answered.correct ? 'green' : 'red'} onPress={next} />
        </View>
      )}

      <WordSheet word={word} onClose={() => setWord(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 18 },
  bar: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, backgroundColor: colors.green },
  body: { paddingBottom: 20, gap: 14 },
  kicker: { color: colors.primaryDark, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  sentenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  en: { fontSize: 18, color: colors.muted, lineHeight: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  option: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 64,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.lineDark,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  key: { position: 'absolute', top: 6, left: 10, fontSize: 12, color: colors.locked },
  optionText: { fontSize: 24, lineHeight: 38 },
  typeBox: { gap: 10, marginTop: 8 },
  input: {
    borderWidth: 2,
    borderColor: colors.lineDark,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: fonts.gu,
    color: colors.ink,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  after: { gap: 8 },
  note: { fontSize: 15, lineHeight: 22, backgroundColor: colors.tealSoft, borderRadius: 12, padding: 12 },
  tapHint: { fontSize: 13, color: colors.muted },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  saveText: { color: colors.primaryDark, fontSize: 15 },
  sheet: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, gap: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -8 },
  verdict: { fontSize: 20 },
  solution: { fontSize: 16, color: colors.redDark },
  solutionGu: { fontSize: 26, lineHeight: 40, color: colors.redDark },
  chosen: { fontSize: 14, color: colors.muted },
  chosenGu: { fontSize: 16, color: colors.muted },
});
