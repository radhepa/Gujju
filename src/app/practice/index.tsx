import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { clozeContext, practiceSources } from '../../content/library';
import { cardsFor, sourceStats, type PracticeSource, type SourceStats } from '../../lib/cloze';
import { makeRng } from '../../lib/rng';
import type { ClozeMode } from '../../lib/types';
import { Kesar } from '../../mascot/Kesar';
import { useProgress } from '../../state/progress';
import { Header } from '../../ui/Header';
import { Screen } from '../../ui/Screen';
import { Gu, Text } from '../../ui/Text';
import { colors, shadow } from '../../ui/theme';

const LEVELS = ['', 'Beginner', 'Elementary', 'Intermediate'];
const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + 's'}`;

export default function PracticeHub() {
  const { snapshot, cardRows, updateSettings } = useProgress();
  const mode = snapshot.settings.clozeMode;
  const rows = useMemo(() => {
    const now = new Date();
    const rng = makeRng(1);
    return practiceSources(snapshot.books).map((s) => ({ source: s, stats: sourceStats(cardsFor(s, clozeContext(), rng), cardRows, now) }));
  }, [snapshot.books, cardRows]);
  const collections = rows.filter((r) => r.source.kind === 'collection');
  const books = rows.filter((r) => r.source.kind === 'book' && r.stats.total > 0);
  const mastered = rows.reduce((n, r) => n + r.stats.mastered, 0);
  const seen = rows.reduce((n, r) => n + r.stats.seen, 0);

  return (
    <Screen>
      <Header title="Sentence practice" titleGu="વાક્ય અભ્યાસ" />

      <View style={[styles.intro, shadow]}>
        <Kesar size={64} pose="read" />
        <View style={{ flex: 1 }}>
          <Text weight="black" style={{ fontSize: 17 }}>
            Learn words in real sentences
          </Text>
          <Text style={styles.muted}>
            {seen
              ? `${plural(seen, 'sentence')} seen, ${mastered} mastered.`
              : 'Fill the gap in each sentence. Every sentence comes back on its own schedule until you know it.'}
          </Text>
        </View>
      </View>

      <View style={styles.modes}>
        <ModeButton label="Multiple choice" icon="grid-outline" active={mode === 'choice'} onPress={() => updateSettings({ clozeMode: 'choice' })} />
        <ModeButton label="Type it" icon="create-outline" active={mode === 'type'} onPress={() => updateSettings({ clozeMode: 'type' })} />
      </View>

      <Text weight="black" style={styles.section}>
        Collections
      </Text>
      {collections.map((r) => (
        <SourceCard key={r.source.id} source={r.source} stats={r.stats} />
      ))}

      {books.length > 0 && (
        <>
          <Text weight="black" style={styles.section}>
            From your library
          </Text>
          {books.map((r) => (
            <SourceCard key={r.source.id} source={r.source} stats={r.stats} compact />
          ))}
        </>
      )}

      <Pressable onPress={() => router.push('/library')} style={styles.link} accessibilityRole="button">
        <Ionicons name="library-outline" size={18} color={colors.teal} />
        <Text weight="bold" style={styles.linkText}>
          Make your own book to practise from
        </Text>
      </Pressable>
    </Screen>
  );
}

function ModeButton({ label, icon, active, onPress }: { label: string; icon: 'grid-outline' | 'create-outline'; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.mode, active && styles.modeActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={18} color={active ? colors.primaryDark : colors.muted} />
      <Text weight="bold" style={{ color: active ? colors.primaryDark : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SourceCard({ source, stats, compact }: { source: PracticeSource; stats: SourceStats; compact?: boolean }) {
  const seenPct = stats.total ? stats.seen / stats.total : 0;
  const masteredPct = stats.total ? stats.mastered / stats.total : 0;
  const play = () => router.push({ pathname: '/practice/[id]', params: { id: source.id } });
  return (
    <Pressable onPress={play} style={({ pressed }) => [styles.card, shadow, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text weight="black" style={styles.cardTitle}>
            {source.title}
          </Text>
          {source.titleGu ? <Gu style={styles.cardGu}>{source.titleGu}</Gu> : null}
        </View>
        {stats.due > 0 ? (
          <View style={styles.due}>
            <Text weight="black" style={styles.dueText}>
              {stats.due} due
            </Text>
          </View>
        ) : null}
        <Ionicons name="play-circle" size={36} color={colors.primary} />
      </View>
      {!compact && source.level ? (
        <Text style={styles.muted}>
          {LEVELS[source.level]} · {plural(stats.total, 'sentence')}
        </Text>
      ) : (
        <Text style={styles.muted}>{plural(stats.total, 'sentence')}</Text>
      )}
      <View style={styles.track}>
        <View style={[styles.seen, { width: `${seenPct * 100}%` }]} />
        <View style={[styles.mastered, { width: `${masteredPct * 100}%` }]} />
      </View>
      <Text style={styles.small}>
        {stats.seen} seen · {stats.mastered} mastered
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 14,
  },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  modes: { flexDirection: 'row', gap: 10, marginTop: 14 },
  mode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  modeActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  section: { fontSize: 18, marginTop: 22, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 18 },
  cardGu: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  due: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  dueText: { color: colors.primaryDark, fontSize: 13 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden', marginTop: 6 },
  seen: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.tealSoft },
  mastered: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.green },
  small: { fontSize: 12, color: colors.muted },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
  linkText: { color: colors.teal, fontSize: 15 },
});
