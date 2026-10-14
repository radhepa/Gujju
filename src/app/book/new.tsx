import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { bookToText, MAX_BOOK_SENTENCES, newBookId, parseBookText } from '../../lib/books';
import { normGu } from '../../lib/text';
import { useProgress } from '../../state/progress';
import { Button } from '../../ui/Button';
import { Header } from '../../ui/Header';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { colors, fonts } from '../../ui/theme';

// Make a book from any Gujarati text, or edit one you made.
export default function NewBook() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { snapshot, saveBook } = useProgress();
  const existing = id ? snapshot.books.find((b) => b.id === id) : undefined;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing ? bookToText(existing) : '');
  const parsed = useMemo(() => parseBookText(text), [text]);
  const translated = parsed.filter((s) => s.en).length;

  const save = async () => {
    const bookId = existing?.id ?? newBookId();
    // Keep the old ids (and so the practice progress) of sentences that
    // didn't change; new ones get fresh ids.
    const oldIds = new Map(existing?.sentences.map((s) => [normGu(s.gu), s.id]) ?? []);
    const used = new Set<string>();
    const stamp = Date.now().toString(36);
    const sentences = parsed.map((s, i) => {
      const old = oldIds.get(normGu(s.gu));
      const sid = old && !used.has(old) ? old : `${stamp}-${i}`;
      used.add(sid);
      return { ...s, id: sid };
    });
    await saveBook({
      id: bookId,
      title: title.trim() || 'Untitled book',
      builtIn: false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      blurb: existing?.blurb,
      titleGu: existing?.titleGu,
      sentences,
    });
    router.replace({ pathname: '/book/[id]', params: { id: bookId } });
  };

  return (
    <Screen>
      <Header title={existing ? 'Edit book' : 'New book'} />
      <Text weight="bold" style={styles.label}>
        Title
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ba's dal recipe"
        placeholderTextColor={colors.locked}
        style={styles.input}
      />

      <Text weight="bold" style={styles.label}>
        Gujarati text
      </Text>
      <Text style={styles.help}>
        Paste or type any Gujarati. It's split into sentences at full stops, question marks and new lines. To add a translation, put
        it after a | on the same line.
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={'હું ઘરે છું. | I am at home.\nઆજે ગરમી છે.'}
        placeholderTextColor={colors.locked}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.area]}
      />
      <Text style={styles.help}>
        {parsed.length
          ? `${parsed.length} ${parsed.length === 1 ? 'sentence' : 'sentences'}${translated ? `, ${translated} with English` : ''}.`
          : 'No Gujarati sentences yet.'}
        {parsed.length >= MAX_BOOK_SENTENCES ? ` Only the first ${MAX_BOOK_SENTENCES} are kept.` : ''}
      </Text>

      <View style={{ marginTop: 12 }}>
        <Button label={existing ? 'Save changes' : 'Make book'} onPress={save} disabled={!parsed.length} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, marginTop: 14, marginBottom: 6 },
  help: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: colors.lineDark,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: fonts.gu,
    color: colors.ink,
  },
  area: { minHeight: 220 },
});
