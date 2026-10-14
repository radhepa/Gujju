import { StyleSheet, View } from 'react-native';
import { addDays, dayKey } from '../lib/dates';
import { isPracticeCard, MASTERED_STABILITY } from '../lib/cloze';
import { bestStreak } from '../lib/streak';
import { Kesar } from '../mascot/Kesar';
import { useProgress } from '../state/progress';
import { Button } from '../ui/Button';
import { Header } from '../ui/Header';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { colors, shadow } from '../ui/theme';

export const GOALS = [20, 50, 100, 150];
const WEEKS = 12;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Stats() {
  const { snapshot, streak, xpToday, learnedIds, completed, cardRows, updateSettings } = useProgress();
  const goal = snapshot.settings.dailyGoal;
  const today = dayKey(new Date());
  const xpByDay = new Map(snapshot.dailyStats.map((s) => [s.date, s.xp]));
  const practice = [...cardRows.values()].filter((c) => isPracticeCard(c.itemId));
  const mastered = practice.filter((c) => c.stability >= MASTERED_STABILITY).length;
  const totalXp = snapshot.dailyStats.reduce((n, s) => n + s.xp, 0);

  // Weeks run Monday to Sunday, oldest on the left, this week on the right.
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const thisMonday = addDays(today, -mondayOffset);
  const start = addDays(thisMonday, -7 * (WEEKS - 1));
  const peak = Math.max(goal, ...[...xpByDay.values()]);

  // How many cards fall due on each of the next seven days.
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const n = [...cardRows.values()].filter((c) => {
      const due = dayKey(new Date(c.due));
      return i === 0 ? due <= day : due === day;
    }).length;
    return { day, n };
  });
  const most = Math.max(1, ...forecast.map((f) => f.n));

  return (
    <Screen>
      <Header title="Your progress" titleGu="તમારી પ્રગતિ" />

      <View style={[styles.card, shadow, styles.goalCard]}>
        <Kesar size={72} pose={xpToday >= goal ? 'cheer' : 'idle'} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text weight="black" style={{ fontSize: 18 }}>
            {xpToday >= goal ? 'Daily goal reached!' : 'Daily goal'}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(1, xpToday / goal) * 100}%` }]} />
          </View>
          <Text style={styles.muted}>
            {xpToday} / {goal} XP today
          </Text>
        </View>
      </View>
      <View style={styles.goals}>
        {GOALS.map((g) => (
          <Button key={g} label={`${g}`} variant={g === goal ? 'primary' : 'plain'} onPress={() => updateSettings({ dailyGoal: g })} style={{ flex: 1 }} />
        ))}
      </View>
      <Text style={styles.small}>XP a day. 50 is about one lesson and a round of sentences.</Text>

      <View style={styles.grid}>
        <Stat label="Streak" value={`${streak.days}`} sub={streak.days === 1 ? 'day' : 'days'} color={colors.primary} />
        <Stat label="Best streak" value={`${bestStreak(snapshot.dailyStats)}`} sub="days" color={colors.primaryDark} />
        <Stat label="Total XP" value={`${totalXp}`} sub="all time" color={colors.teal} />
        <Stat label="Lessons" value={`${completed.size}`} sub="finished" color={colors.green} />
        <Stat label="Words & letters" value={`${learnedIds.length}`} sub="in review" color={colors.green} />
        <Stat label="Sentences" value={`${practice.length}`} sub={`${mastered} mastered`} color={colors.teal} />
      </View>

      <Text weight="black" style={styles.section}>
        Last {WEEKS} weeks
      </Text>
      <View style={[styles.card, shadow]}>
        <View style={styles.heat}>
          <View style={styles.heatLabels}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.heatLabel}>
                {d}
              </Text>
            ))}
          </View>
          {Array.from({ length: WEEKS }, (_, w) => (
            <View key={w} style={styles.heatCol}>
              {Array.from({ length: 7 }, (_, d) => {
                const day = addDays(start, w * 7 + d);
                const xp = xpByDay.get(day) ?? 0;
                const future = day > today;
                const level = xp === 0 ? 0 : Math.min(4, Math.ceil((xp / peak) * 4));
                return (
                  <View
                    key={d}
                    style={[
                      styles.cell,
                      { backgroundColor: future ? 'transparent' : HEAT[level] },
                      day === today && styles.todayCell,
                    ]}
                    accessibilityLabel={`${day}: ${xp} XP`}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Text weight="black" style={styles.section}>
        Reviews coming up
      </Text>
      <View style={[styles.card, shadow, styles.forecast]}>
        {forecast.map((f, i) => (
          <View key={f.day} style={styles.barCol}>
            <Text style={styles.small}>{f.n}</Text>
            <View style={[styles.bar, { height: 4 + (f.n / most) * 80 }]} />
            <Text style={styles.small}>{i === 0 ? 'Today' : WEEKDAYS[(new Date(f.day + 'T00:00').getDay() + 6) % 7]}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const HEAT = [colors.line, '#F7D9AE', '#F0B566', colors.primary, colors.primaryDark];

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={[styles.stat, shadow]}>
      <Text weight="bold" style={styles.statLabel}>
        {label}
      </Text>
      <Text weight="black" style={[styles.statValue, { color }]}>
        {value}
      </Text>
      <Text style={styles.small}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.line, padding: 14 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 7 },
  muted: { color: colors.muted, fontSize: 14 },
  small: { color: colors.muted, fontSize: 12 },
  goals: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  stat: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  statValue: { fontSize: 26 },
  section: { fontSize: 18, marginTop: 22, marginBottom: 10 },
  heat: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  heatLabels: { gap: 4, marginRight: 2 },
  heatLabel: { fontSize: 10, color: colors.muted, height: 18, lineHeight: 18 },
  heatCol: { gap: 4 },
  cell: { width: 18, height: 18, borderRadius: 4 },
  todayCell: { borderWidth: 2, borderColor: colors.teal },
  forecast: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { alignItems: 'center', gap: 4, flex: 1 },
  bar: { width: 18, borderRadius: 6, backgroundColor: colors.teal },
});
