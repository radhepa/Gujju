import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { examplesFor } from '../content/library';
import { allEntries } from '../content/practice';
import { normGu, normTranslit } from '../lib/text';
import type { LexEntry } from '../lib/types';
import { Header } from '../ui/Header';
import { Screen } from '../ui/Screen';
import { Speak } from '../ui/Speak';
import { Gu, Text } from '../ui/Text';
import { colors, fonts, shadow } from '../ui/theme';
import { POS_LABEL } from '../ui/WordSheet';

interface Headword {
  gu: string;
  tr: string;
  entries: LexEntry[];
}

const MAX_RESULTS = 60;

function headwords(): Headword[] {
  const map = new Map<string, Headword>();
  for (const e of allEntries()) {
    const k = normGu(e.gu);
    const h = map.get(k) ?? { gu: e.gu, tr: e.tr, entries: [] };
    h.entries.push(e);
    map.set(k, h);
  }
  return [...map.values()].sort((a, b) => a.tr.localeCompare(b.tr));
}

// Score a headword against the query: exact beats prefix beats anywhere.
function score(h: Headword, q: string): number {
  if (/[\u0A80-\u0AFF]/.test(q)) {
    const g = normGu(h.gu);
    const n = normGu(q);
    return g === n ? 3 : g.startsWith(n) ? 2 : g.includes(n) ? 1 : 0;
  }
  const lower = q.toLowerCase().trim();
  const t = normTranslit(h.tr);
  const nq = normTranslit(lower);
  let best = 0;
  if (nq && t === nq) best = 3;
  else if (nq && t.startsWith(nq)) best = 2;
  for (const e of h.entries) {
    const en = e.en.toLowerCase();
    // "water" should find પાણી ("water") before ઘડો ("water pot"): a whole
    // meaning beats a word inside a longer one.
    const meanings = en.split(/[,;/]|\(/).map((m) => m.replace(/^to /, '').trim());
    if (meanings.includes(lower) || meanings.includes(lower.replace(/^to /, ''))) best = Math.max(best, 4);
    else if (en.split(/[^a-z']+/).includes(lower)) best = Math.max(best, 2.5);
    else if (en.includes(lower)) best = Math.max(best, 1);
  }
  return best;
}

const baseRank = (h: Headword) => (h.entries.every((e) => e.base) ? 1 : 0);

export default function Dictionary() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ? String(params.q) : '');
  const [open, setOpen] = useState<string | null>(params.q ? normGu(String(params.q)) : null);
  const all = useMemo(headwords, []);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return all
      .map((h) => ({ h, s: score(h, q) }))
      .filter((r) => r.s > 0)
      // Ties go to dictionary forms (no `base`), then shorter words.
      .sort((a, b) => b.s - a.s || baseRank(a.h) - baseRank(b.h) || a.h.gu.length - b.h.gu.length)
      .slice(0, MAX_RESULTS)
      .map((r) => r.h);
  }, [all, q]);

  return (
    <Screen>
      <Header title="Dictionary" titleGu="શબ્દકોશ" />
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setOpen(null);
          }}
          placeholder="Search in English, Gujarati or transliteration"
          placeholderTextColor={colors.locked}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} accessibilityLabel="Clear" hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.locked} />
          </Pressable>
        ) : null}
      </View>

      {!q.trim() ? (
        <Text style={styles.muted}>
          {all.length} words, from the lessons, the sentence collections and the stories. Try “water”, “paaNee” or “પાણી”.
        </Text>
      ) : results.length === 0 ? (
        <Text style={styles.muted}>No words match “{q}”.</Text>
      ) : (
        results.map((h) => <Row key={h.gu} h={h} open={open === normGu(h.gu)} onToggle={() => setOpen(open === normGu(h.gu) ? null : normGu(h.gu))} />)
      )}
    </Screen>
  );
}

function Row({ h, open, onToggle }: { h: Headword; open: boolean; onToggle: () => void }) {
  const examples = open ? examplesFor(h.gu, 4) : [];
  const base = h.entries.find((e) => e.base)?.base;
  return (
    <Pressable onPress={onToggle} style={[styles.row, shadow]} accessibilityRole="button">
      <View style={styles.rowTop}>
        <Gu bold style={styles.gu}>
          {h.gu}
        </Gu>
        <Text style={styles.tr}>{h.tr}</Text>
        <View style={{ flex: 1 }} />
        <Speak text={h.gu} />
      </View>
      {h.entries.map((e, i) => (
        <Text key={i} style={styles.en}>
          {e.en} <Text style={styles.pos}>{POS_LABEL[e.pos] ?? e.pos}</Text>
        </Text>
      ))}
      {open && (
        <View style={styles.more}>
          {base && normGu(base) !== normGu(h.gu) ? (
            <Text style={styles.small}>
              Dictionary form: <Gu style={styles.smallGu}>{base}</Gu>
            </Text>
          ) : null}
          {h.entries.map((e, i) => (e.note ? <Text key={i} style={styles.small}>{e.note}</Text> : null))}
          {examples.map((x, i) => (
            <View key={i} style={styles.example}>
              <Gu style={styles.exGu}>{x.gu}</Gu>
              {x.en ? <Text style={styles.small}>{x.en}</Text> : null}
            </View>
          ))}
          {!examples.length ? <Text style={styles.small}>No example sentences yet.</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.lineDark,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 17, fontFamily: fonts.gu, color: colors.ink },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  row: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.line, padding: 12, marginBottom: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gu: { fontSize: 24, lineHeight: 36 },
  tr: { fontSize: 15, color: colors.muted },
  en: { fontSize: 16 },
  pos: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  more: { borderTopWidth: 1, borderColor: colors.line, marginTop: 8, paddingTop: 8, gap: 6 },
  small: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  smallGu: { fontSize: 16, color: colors.ink },
  example: { gap: 0 },
  exGu: { fontSize: 18, lineHeight: 28 },
});
