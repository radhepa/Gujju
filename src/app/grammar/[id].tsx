import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { course } from '../../content/course';
import { findTopic, grammar } from '../../content/guides';
import { useProgress } from '../../state/progress';
import { Button } from '../../ui/Button';
import { Header } from '../../ui/Header';
import { Notice } from '../../ui/Notice';
import { Rich } from '../../ui/Rich';
import { Screen } from '../../ui/Screen';
import { SentenceView } from '../../ui/SentenceView';
import { Speak } from '../../ui/Speak';
import { Gu, Text } from '../../ui/Text';
import { colors, shadow } from '../../ui/theme';
import { WordSheet } from '../../ui/WordSheet';

const HAS_GU = /[઀-૿]/;

export default function GrammarTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useProgress();
  const topic = findTopic(String(id));
  const [showTr, setShowTr] = useState(true);
  const [word, setWord] = useState<string | null>(null);
  if (!topic) return <Notice title="Can't find that page" pose="think" />;

  const next = grammar[grammar.indexOf(topic) + 1];
  const units = topic.units.flatMap((u) => course.units.filter((x) => x.id === u && x.title));

  return (
    <Screen>
      <Header title={topic.title} titleGu={topic.titleGu} />
      <Text style={styles.summary}>{topic.summary}</Text>

      {topic.sections.map((s, i) => (
        <View key={i} style={[styles.card, shadow]}>
          <Rich text={`**${s.heading}**`} style={styles.heading} />
          <Rich text={s.body} style={styles.body} />
          {s.table?.length ? (
            <View style={styles.table}>
              {s.table.map((row, r) => {
                // A first row with no Gujarati in it, above rows that have
                // some, is a header.
                const header = r === 0 && !row.some((c) => HAS_GU.test(c)) && s.table!.slice(1).some((x) => x.some((c) => HAS_GU.test(c)));
                return (
                  <View key={r} style={[styles.tr, header ? styles.th : r % 2 === 1 && styles.trAlt]}>
                    {row.map((cell, c) => (
                      <View key={c} style={styles.td}>
                        {HAS_GU.test(cell) ? (
                          <Gu style={styles.cellGu}>{cell}</Gu>
                        ) : (
                          <Text weight={header ? 'black' : undefined} style={[styles.cell, header && styles.thText]}>
                            {cell}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ) : null}
          {s.examples?.map((e, j) => (
            <View key={j} style={styles.example}>
              <View style={styles.exampleTop}>
                <View style={{ flex: 1 }}>
                  <SentenceView
                    gu={e.gu}
                    tr={e.tr}
                    showTranslit={showTr || snapshot.settings.alwaysShowTranslit}
                    size={20}
                    onWord={setWord}
                  />
                </View>
                <Speak text={e.gu} size={18} />
              </View>
              <Text style={styles.en}>{e.en}</Text>
            </View>
          ))}
        </View>
      ))}

      <Pressable onPress={() => setShowTr((v) => !v)} style={styles.toggle} accessibilityRole="button">
        <Text weight="bold" style={styles.toggleText}>
          {showTr ? 'Hide transliteration' : 'Show transliteration'}
        </Text>
      </Pressable>

      {units.length ? (
        <Text style={styles.small}>Practised in {units.map((u) => `unit ${u.order}, ${u.title}`).join('; ')}.</Text>
      ) : null}
      {next ? (
        <Button
          label={`Next: ${next.title}`}
          variant="plain"
          onPress={() => router.replace({ pathname: '/grammar/[id]', params: { id: next.id } })}
          style={{ marginTop: 12 }}
        />
      ) : null}
      <WordSheet word={word} onClose={() => setWord(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.line, padding: 14, marginTop: 12, gap: 10 },
  heading: { fontSize: 18 },
  body: { fontSize: 15, lineHeight: 23 },
  table: { borderRadius: 10, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  tr: { flexDirection: 'row' },
  trAlt: { backgroundColor: colors.bg },
  th: { backgroundColor: colors.greenSoft },
  thText: { fontSize: 12, color: colors.greenDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' },
  cell: { fontSize: 14 },
  cellGu: { fontSize: 17, lineHeight: 26 },
  example: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, gap: 2 },
  exampleTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  en: { fontSize: 14, color: colors.muted },
  toggle: { alignSelf: 'flex-start', paddingVertical: 12 },
  toggleText: { color: colors.teal, fontSize: 14 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 19 },
});
