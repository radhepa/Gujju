import { StyleSheet, View } from 'react-native';
import type { Summary } from '../lib/session';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

export function SessionComplete({
  title,
  subtitle,
  summary,
  streak,
  onContinue,
}: {
  title: string;
  subtitle?: string;
  summary: Summary;
  streak: number;
  onContinue: () => void;
}) {
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Text weight="black" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.stats}>
          <Stat label="XP" value={`+${summary.xp}`} color={colors.primary} />
          <Stat label="First try" value={`${Math.round(summary.accuracy * 100)}%`} color={colors.green} />
          <Stat label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} color={colors.teal} />
        </View>
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
  go: { marginBottom: 16 },
});
