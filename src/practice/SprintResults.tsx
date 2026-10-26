import { ScrollView, StyleSheet, View } from 'react-native';
import { averageMs, letterCardId, MASTERY_LABEL, masteryOf, type Glyph } from '../lib/letters';
import type { CardRow } from '../lib/types';
import { Kesar } from '../mascot/Kesar';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';
import type { SprintResult } from './LetterSprint';

// The end of a letter round: the score against your best, how quick you
// were, the letters you mixed up and the ones that levelled up.
export function SprintResults({
  result,
  timed,
  prevBest,
  xp,
  glyphs,
  before,
  after,
  onAgain,
  onDone,
}: {
  result: SprintResult;
  timed: boolean;
  prevBest: number;
  xp: number;
  glyphs: Map<string, Glyph>;
  // Card rows when the round started and now, to show what levelled up.
  before: Map<string, CardRow>;
  after: Map<string, CardRow>;
  onAgain: () => void;
  onDone: () => void;
}) {
  const { score, right, wrong, bestCombo, round } = result;
  const newBest = timed && score > prevBest && score > 0;
  const total = right + wrong;
  const accuracy = total ? right / total : 1;
  const avg = averageMs(round.tally) / 1000;
  const mixed = Object.entries(round.tally)
    .filter(([, t]) => t.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .map(([id, t]) => ({ g: glyphs.get(id)!, t }))
    .filter((m) => m.g);
  const levelled = Object.keys(round.tally)
    .map((id) => ({ g: glyphs.get(id)!, from: masteryOf(before.get(letterCardId(id))), to: masteryOf(after.get(letterCardId(id))) }))
    .filter((l) => l.g && l.to > l.from);

  const title = newBest ? 'New best!' : timed ? 'Time’s up!' : 'Round done!';
  const pose = newBest ? 'dance' : accuracy >= 0.8 ? 'cheer' : 'read';

  return (
    <Screen scroll={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.wrap}>
        <Kesar size={130} pose={pose} />
        <Text weight="black" style={styles.title}>
          {title}
        </Text>
        {timed ? (
          <View style={styles.scoreWrap}>
            <Text weight="black" style={styles.score}>
              {score}
            </Text>
            <Text style={styles.muted}>{newBest ? (prevBest ? `Beat your old best of ${prevBest}` : 'Your first score to beat') : `Best: ${prevBest}`}</Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          <Stat label="Right" value={`${right}/${total}`} color={colors.green} />
          <Stat label="Per letter" value={avg ? `${avg.toFixed(1)}s` : '–'} color={colors.teal} />
          <Stat label="Best run" value={`${bestCombo}`} color={colors.primary} />
          <Stat label="XP" value={`+${xp}`} color={colors.primaryDark} />
        </View>

        {mixed.length > 0 ? (
          <View style={styles.box}>
            <Text weight="black" style={styles.boxLabel}>
              Mixed up
            </Text>
            {mixed.slice(0, 6).map(({ g, t }) => (
              <View key={g.id} style={styles.mixRow}>
                <Gu style={styles.mixGu}>{g.shape}</Gu>
                <Text weight="bold" style={styles.mixSound}>
                  {g.sound || 'no vowel'}
                </Text>
                <Text style={styles.mixNote}>
                  {t.picked.length ? `you picked ${[...new Set(t.picked)].join(', ')}` : ''}
                </Text>
                <Text weight="black" style={styles.mixCount}>
                  ×{t.wrong}
                </Text>
              </View>
            ))}
            <Text style={styles.small}>These come back sooner, in this challenge and in tomorrow’s mix.</Text>
          </View>
        ) : total > 0 ? (
          <Text weight="bold" style={styles.clean}>
            Not a single slip. ખૂબ સરસ!
          </Text>
        ) : null}

        {levelled.length > 0 ? (
          <View style={styles.box}>
            <Text weight="black" style={styles.boxLabel}>
              Levelled up
            </Text>
            <View style={styles.chips}>
              {levelled.map(({ g, to }) => (
                <View key={g.id} style={[styles.chip, to === 4 && styles.chipGold]}>
                  <Gu style={styles.chipGu}>{g.shape}</Gu>
                  <Text weight="bold" style={styles.chipLabel}>
                    {MASTERY_LABEL[to]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.buttons}>
        <Button label="Play again" onPress={onAgain} />
        <Button label="Done" variant="plain" onPress={onDone} />
      </View>
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
  wrap: { alignItems: 'center', gap: 10, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 30, color: colors.primaryDark, textAlign: 'center' },
  scoreWrap: { alignItems: 'center' },
  score: { fontSize: 56, color: colors.primary, lineHeight: 64 },
  muted: { color: colors.muted, fontSize: 15 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 8, alignSelf: 'stretch' },
  stat: { flex: 1, borderWidth: 2, borderRadius: 14, overflow: 'hidden', alignItems: 'center' },
  statLabel: { color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, width: '100%', textAlign: 'center', paddingVertical: 4 },
  statValue: { fontSize: 18, paddingVertical: 10 },
  box: { alignSelf: 'stretch', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 6 },
  boxLabel: { fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mixGu: { fontSize: 30, lineHeight: 46, minWidth: 44, textAlign: 'center' },
  mixSound: { fontSize: 16, minWidth: 48 },
  mixNote: { flex: 1, fontSize: 14, color: colors.muted },
  mixCount: { fontSize: 14, color: colors.red },
  small: { fontSize: 13, color: colors.muted },
  clean: { fontSize: 16, color: colors.greenDark, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { alignItems: 'center', borderRadius: 12, backgroundColor: colors.greenSoft, paddingHorizontal: 12, paddingBottom: 4 },
  chipGold: { backgroundColor: '#FCEFC2' },
  chipGu: { fontSize: 24, lineHeight: 38 },
  chipLabel: { fontSize: 11, color: colors.greenDark, marginTop: -4 },
  buttons: { gap: 10, paddingBottom: 16 },
});
