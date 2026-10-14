import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { lookup } from '../content/practice';
import type { Pos } from '../lib/types';
import { Speak } from './Speak';
import { Gu, Text } from './Text';
import { colors, maxWidth } from './theme';

export const POS_LABEL: Record<Pos, string> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  pron: 'pronoun',
  post: 'postposition',
  conj: 'conjunction',
  part: 'particle',
  num: 'number',
  interj: 'interjection',
  q: 'question word',
};

// What a tapped word means: every gloss on record, its dictionary form, a
// speaker button and a way into the dictionary.
export function WordSheet({ word, onClose }: { word: string | null; onClose: () => void }) {
  const entries = word ? lookup(word) : [];
  const tr = entries[0]?.tr;
  const base = entries.find((e) => e.base)?.base;

  return (
    <Modal visible={!!word} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.inner}>
          <View style={styles.top}>
            <Gu bold style={styles.word}>
              {word}
            </Gu>
            {word ? <Speak text={word} size={26} /> : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}>
              <Ionicons name="close" size={26} color={colors.locked} />
            </Pressable>
          </View>
          {tr ? <Text style={styles.tr}>{tr}</Text> : null}

          {entries.length ? (
            entries.map((e, i) => (
              <View key={i} style={styles.row}>
                <Text weight="bold" style={styles.en}>
                  {e.en}
                </Text>
                <Text style={styles.pos}>{POS_LABEL[e.pos] ?? e.pos}</Text>
                {e.note ? <Text style={styles.note}>{e.note}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.note}>This word isn't in the word list yet.</Text>
          )}

          {base && base !== word ? (
            <Text style={styles.base}>
              Dictionary form: <Gu style={styles.baseGu}>{base}</Gu>
            </Text>
          ) : null}

          {word ? (
            <Pressable
              onPress={() => {
                onClose();
                router.push({ pathname: '/dictionary', params: { q: base ?? word } });
              }}
              style={styles.more}
              accessibilityRole="button"
            >
              <Ionicons name="book-outline" size={16} color={colors.teal} />
              <Text weight="bold" style={styles.moreText}>
                Examples in the dictionary
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(42,36,32,0.35)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 14,
    paddingBottom: 30,
  },
  inner: { width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: 20, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { fontSize: 34, lineHeight: 52 },
  tr: { fontSize: 16, color: colors.muted, marginTop: -6 },
  row: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, marginTop: 4 },
  en: { fontSize: 18 },
  pos: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  note: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 2 },
  base: { fontSize: 15, color: colors.muted, marginTop: 6 },
  baseGu: { fontSize: 17, color: colors.ink },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  moreText: { color: colors.teal, fontSize: 15 },
});
