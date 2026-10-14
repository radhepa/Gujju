import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { course } from '../content/course';
import { NEW_PER_DAY } from '../lib/progress';
import { useProgress } from '../state/progress';
import { Button } from '../ui/Button';
import { goBack } from '../ui/nav';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

const MIN_RETENTION = 0.8;
const MAX_RETENTION = 0.97;

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('Are you sure?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: onYes },
  ]);
}

export default function SettingsScreen() {
  const { snapshot, updateSettings, resetProgress, learnedIds } = useProgress();
  const { retention, alwaysShowTranslit } = snapshot.settings;
  const step = (d: number) => {
    const next = Math.round((retention + d) * 100) / 100;
    updateSettings({ retention: Math.min(MAX_RETENTION, Math.max(MIN_RETENTION, next)) });
  };
  const totalXp = snapshot.dailyStats.reduce((n, s) => n + s.xp, 0);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityLabel="Back" hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.ink} />
        </Pressable>
        <Text weight="black" style={styles.title}>
          Settings
        </Text>
      </View>

      <View style={styles.card}>
        <Text weight="black" style={styles.label}>
          Target retention
        </Text>
        <Text style={styles.help}>
          How much of what you've learned you want to still remember when a review comes up. Higher means more reviews.
        </Text>
        <View style={styles.stepper}>
          <Button label="−" variant="plain" onPress={() => step(-0.01)} disabled={retention <= MIN_RETENTION} />
          <Text weight="black" style={styles.value}>
            {Math.round(retention * 100)}%
          </Text>
          <Button label="+" variant="plain" onPress={() => step(0.01)} disabled={retention >= MAX_RETENTION} />
        </View>
        <Text style={styles.small}>Changes apply from your next review of each item.</Text>
      </View>

      <View style={[styles.card, styles.row]}>
        <View style={{ flex: 1 }}>
          <Text weight="black" style={styles.label}>
            Always show transliteration
          </Text>
          <Text style={styles.help}>Later lessons hide it on purpose so you read the script.</Text>
        </View>
        <Switch
          value={alwaysShowTranslit}
          onValueChange={(v) => updateSettings({ alwaysShowTranslit: v })}
          trackColor={{ true: colors.green, false: colors.line }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.card}>
        <Text weight="black" style={styles.label}>
          Your progress
        </Text>
        <Text style={styles.help}>
          {learnedIds.length} of {Object.keys(course.items).length} items learned · {totalXp} XP total · up to{' '}
          {NEW_PER_DAY} new items a day
        </Text>
        <Text style={styles.small}>Saved on this device. Sync between devices is coming.</Text>
        <Button
          label="Reset progress"
          variant="red"
          style={{ marginTop: 12 }}
          onPress={() => confirm('This deletes all your lessons, reviews and streak on this device.', resetProgress)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  title: { fontSize: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 14,
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 17 },
  help: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 8 },
  value: { fontSize: 28, minWidth: 80, textAlign: 'center' },
});
