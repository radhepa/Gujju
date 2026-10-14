import { StyleSheet, View } from 'react-native';
import type { Summary } from '../lib/session';
import type { Item } from '../lib/types';
import { Button } from '../ui/Button';
import { Kesar, type Pose } from '../mascot/Kesar';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';

export function SessionComplete({
  title,
  subtitle,
  summary,
  streak,
  onContinue,
  pose = 'cheer',
  words,
}: {
  title: string;
  subtitle?: string;
  summary: Summary;
  streak: number;
  onContinue: () => void;
  pose?: Pose;
  // What the lesson taught, shown as chips under the stats.
  words?: { label: string; items: Item[] };
}) {
  const sentences = words?.items.filter((i) => i.type === 'sentence').length ?? 0;
  const chips = words?.items.filter((i) => i.type !== 'sentence') ?? [];
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Kesar size={words ? 140 : 170} pose={pose} />
        <Text weight="black" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.stats}>
          <Stat label="XP" value={`+${summary.xp}`} color={colors.primary} />
          <Stat label="First try" value={`${Math.round(summary.accuracy * 100)}%`} color={colors.green} />
          <Stat label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} color={colors.teal} />
        </View>
        {words && (chips.length > 0 || sentences > 0) ? (
          <View style={styles.words}>
            <Text weight="black" style={styles.wordsLabel}>
              {words.label}
            </Text>
            <View style={styles.chips}>
              {chips.map((i) => (
                <Gu key={i.id} style={styles.chip} accessibilityLabel={`${i.gujarati}, ${i.english}`}>
                  {i.gujarati}
                </Gu>
              ))}
              {sentences > 0 ? (
                <Text style={styles.more}>
                  {chips.length ? '+' : ''}
                  {sentences} {sentences === 1 ? 'sentence' : 'sentences'}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
      <Button label="Continue" onPress={onContinue} style={styles.go} />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Text weight="black" style={[styles.statLabel, { backgroundColor: color }]}>
        {label}
      </Text>
      <Text weight="black" style={[styles.statValue, { color }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 30, color: colors.primaryDark, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 24 },
  stat: { borderWidth: 2, borderRadius: 14, overflow: 'hidden', minWidth: 96, alignItems: 'center' },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    width: '100%',
    textAlign: 'center',
    paddingVertical: 4,
  },
  statValue: { fontSize: 20, paddingVertical: 12 },
  words: {
    alignSelf: 'stretch',
    marginTop: 8,
    padding: 14,
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 16,
  },
  wordsLabel: { fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: {
    fontSize: 17,
    lineHeight: 28,
    paddingHorizontal: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: 'hidden',
  },
  more: { fontSize: 14, color: colors.muted },
  go: { marginBottom: 16 },
});
