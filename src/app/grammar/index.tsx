import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { grammar } from '../../content/guides';
import { Header } from '../../ui/Header';
import { Screen } from '../../ui/Screen';
import { Gu, Text } from '../../ui/Text';
import { colors, shadow } from '../../ui/theme';

const LEVELS = ['', 'Beginner', 'Elementary', 'Lower intermediate'];

// The grammar guide: short pages with tables and examples, beginner first.
export default function GrammarIndex() {
  return (
    <Screen>
      <Header title="Grammar guide" titleGu="વ્યાકરણ" />
      <Text style={styles.muted}>
        Short pages on how Gujarati works, each with examples you can tap for meanings. The lessons link here when a new idea
        comes up.
      </Text>
      {[1, 2, 3].map((level) => {
        const topics = grammar.filter((t) => t.level === level);
        if (!topics.length) return null;
        return (
          <View key={level}>
            <Text weight="black" style={styles.section}>
              {LEVELS[level]}
            </Text>
            {topics.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: t.id } })}
                style={({ pressed }) => [styles.row, shadow, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text weight="black" style={styles.title}>
                    {t.title}
                  </Text>
                  <Gu style={styles.gu}>{t.titleGu}</Gu>
                  <Text style={styles.summary}>{t.summary}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.locked} />
              </Pressable>
            ))}
          </View>
        );
      })}
      {!grammar.length ? <Text style={styles.muted}>The guide is being written.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  section: { fontSize: 18, marginTop: 22, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 17 },
  gu: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  summary: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 2 },
});
