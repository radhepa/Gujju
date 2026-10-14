import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { findBook } from '../../content/library';
import { lookup } from '../../content/practice';
import { words } from '../../lib/text';
import { useProgress } from '../../state/progress';
import { Button } from '../../ui/Button';
import { Header } from '../../ui/Header';
import { goBack } from '../../ui/nav';
import { Notice } from '../../ui/Notice';
import { Screen } from '../../ui/Screen';
import { SentenceView } from '../../ui/SentenceView';
import { Speak } from '../../ui/Speak';
import { Text } from '../../ui/Text';
import { colors, shadow } from '../../ui/theme';
import { WordSheet } from '../../ui/WordSheet';

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('Delete this book?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
}

// The reader: the book sentence by sentence, every word tappable, the
// transliteration and English one tap away.
export default function BookReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, deleteBook } = useProgress();
  const book = findBook(String(id), snapshot.books);
  const [showTr, setShowTr] = useState(snapshot.settings.alwaysShowTranslit);
  const [showEn, setShowEn] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [word, setWord] = useState<string | null>(null);

  if (!book) return <Notice title="Can't find that book" pose="think" />;

  const all = book.sentences.flatMap((s) => words(s.gu));
  const known = all.filter((w) => lookup(w).length > 0).length;
  const coverage = all.length ? Math.round((known / all.length) * 100) : 0;

  return (
    <Screen>
      <Header
        title={book.title}
        titleGu={book.titleGu}
        right={
          <View style={styles.toggles}>
            <Pressable onPress={() => setShowTr((v) => !v)} accessibilityLabel="Transliteration" hitSlop={8}>
              <Ionicons name={showTr ? 'text' : 'text-outline'} size={24} color={showTr ? colors.teal : colors.locked} />
            </Pressable>
            <Pressable onPress={() => setShowEn((v) => !v)} accessibilityLabel="English" hitSlop={8}>
              <Ionicons name={showEn ? 'language' : 'language-outline'} size={24} color={showEn ? colors.teal : colors.locked} />
            </Pressable>
          </View>
        }
      />
      {book.blurb ? <Text style={styles.blurb}>{book.blurb}</Text> : null}
      {!book.builtIn && all.length > 0 ? (
        <Text style={styles.small}>
          {coverage}% of the words here are in the word list. Tap any word to look it up.
        </Text>
      ) : (
        <Text style={styles.small}>Tap any word to see what it means.</Text>
      )}

      <View style={[styles.page, shadow]}>
        {book.sentences.map((s) => {
          const english = showEn || open[s.id];
          return (
            <View key={s.id} style={styles.sentence}>
              <SentenceView gu={s.gu} tr={s.tr} showTranslit={showTr} size={22} onWord={setWord} />
              <View style={styles.tools}>
                {s.en ? (
                  <Pressable onPress={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))} hitSlop={8} accessibilityLabel="Show English">
                    <Ionicons name={english ? 'eye' : 'eye-outline'} size={18} color={colors.locked} />
                  </Pressable>
                ) : null}
                <Speak text={s.gu} size={18} color={colors.locked} />
                {english && s.en ? <Text style={styles.en}>{s.en}</Text> : null}
              </View>
            </View>
          );
        })}
        {!book.sentences.length ? <Text style={styles.small}>This book is empty.</Text> : null}
      </View>

      <Button
        label="Practise these sentences"
        onPress={() => router.push({ pathname: '/practice/[id]', params: { id: `book:${book.id}` } })}
        disabled={!book.sentences.length}
        style={{ marginTop: 16 }}
      />
      {!book.builtIn && (
        <View style={styles.row}>
          <Button
            label="Edit"
            variant="plain"
            onPress={() => router.push({ pathname: '/book/new', params: { id: book.id } })}
            style={{ flex: 1 }}
          />
          <Button
            label="Delete"
            variant="plain"
            onPress={() =>
              confirm(`"${book.title}" will be gone for good. Its practice progress goes with it.`, () => {
                deleteBook(book.id);
                goBack();
              })
            }
            style={{ flex: 1 }}
          />
        </View>
      )}

      <WordSheet word={word} onClose={() => setWord(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggles: { flexDirection: 'row', gap: 14 },
  blurb: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 4 },
  small: { fontSize: 13, color: colors.muted, marginBottom: 10 },
  page: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.line, padding: 16, gap: 16 },
  sentence: { gap: 4 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  en: { flexBasis: '100%', fontSize: 15, color: colors.muted, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
