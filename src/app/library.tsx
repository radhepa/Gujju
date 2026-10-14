import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { allBooks } from '../content/library';
import type { Book } from '../lib/types';
import { useProgress } from '../state/progress';
import { Button } from '../ui/Button';
import { Header } from '../ui/Header';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors, shadow } from '../ui/theme';

const LEVELS = ['', 'Beginner', 'Elementary', 'Intermediate'];

export default function Library() {
  const { snapshot } = useProgress();
  const books = allBooks(snapshot.books);
  const stories = books.filter((b) => b.builtIn);
  const mine = books.filter((b) => !b.builtIn);

  return (
    <Screen>
      <Header title="Library" titleGu="પુસ્તકાલય" />
      <Text style={styles.muted}>
        Read short stories with every word glossed, then practise their sentences. Make your own books from any Gujarati text: a
        recipe from home, a song, a letter.
      </Text>

      <Button label="New book" onPress={() => router.push('/book/new')} style={{ marginTop: 14 }} />

      <Text weight="black" style={styles.section}>
        Stories
      </Text>
      {stories.length ? stories.map((b) => <BookCard key={b.id} book={b} />) : <Text style={styles.muted}>Stories are on their way.</Text>}

      <Text weight="black" style={styles.section}>
        Your books
      </Text>
      {mine.length ? (
        mine.map((b) => <BookCard key={b.id} book={b} />)
      ) : (
        <Text style={styles.muted}>Nothing here yet. Books you make, and sentences you save during practice, show up here.</Text>
      )}
    </Screen>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
      style={({ pressed }) => [styles.card, shadow, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
    >
      <View style={[styles.cover, { backgroundColor: book.builtIn ? colors.primarySoft : colors.tealSoft }]}>
        <Ionicons name={book.builtIn ? 'book' : 'create'} size={26} color={book.builtIn ? colors.primaryDark : colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="black" style={styles.title}>
          {book.title}
        </Text>
        {book.titleGu ? <Gu style={styles.gu}>{book.titleGu}</Gu> : null}
        {book.blurb ? <Text style={styles.blurb}>{book.blurb}</Text> : null}
        <Text style={styles.small}>
          {book.level ? `${LEVELS[book.level]} · ` : ''}
          {book.sentences.length} {book.sentences.length === 1 ? 'sentence' : 'sentences'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.locked} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  section: { fontSize: 18, marginTop: 22, marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
  },
  cover: { width: 52, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17 },
  gu: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  blurb: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 2 },
  small: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
