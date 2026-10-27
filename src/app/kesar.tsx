import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Kesar, type Pose } from '../mascot/Kesar';
import { goBack } from '../ui/nav';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';

const LABELS: Record<Pose, string> = {
  idle: 'Hanging out',
  wave: 'Kem chho!',
  cheer: 'Lesson done',
  read: 'Reviewing',
  eat: 'Dhokla break',
  think: 'Hmm…',
  oops: 'Oops',
  nod: 'Correct',
  sleep: 'Nothing due',
  dance: 'Garba time',
  love: 'Thank you',
  namaste: 'Namaste',
  mango: 'Kesar mango',
  chai: 'Chai time',
  kite: 'Uttarayan',
  butterfly: 'Butterfly',
  sing: 'Singing',
  clap: 'Shabash!',
  roar: 'Mighty roar',
  pounce: 'Pounce!',
  spin: 'Twirl',
  flex: 'So strong',
  wink: 'Wink',
  giggle: 'Giggles',
  shy: 'Shy',
  pout: 'Sulking',
  stretch: 'Big stretch',
  groom: 'Washing up',
  shake: 'Fluff up',
  sneeze: 'Achoo',
  hiccup: 'Hiccups',
};
// The poses he uses around the app; the rest are just him.
const MOODS: Pose[] = ['idle', 'wave', 'cheer', 'read', 'eat', 'think', 'oops', 'nod', 'sleep', 'dance', 'love'];
const FUN = (Object.keys(LABELS) as Pose[]).filter((p) => !MOODS.includes(p));

export default function KesarScreen() {
  const [pose, setPose] = useState<Pose>('idle');
  const [bump, setBump] = useState(0);

  const chips = (poses: Pose[]) => (
    <View style={styles.grid}>
      {poses.map((p) => (
        <Pressable
          key={p}
          onPress={() => {
            setPose(p);
            setBump((b) => b + 1);
          }}
          style={[styles.chip, p === pose && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: p === pose }}
        >
          <Text weight="black" style={[styles.chipText, p === pose && { color: colors.primaryDark }]}>
            {LABELS[p]}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityLabel="Back" hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.ink} />
        </Pressable>
        <Text weight="black" style={styles.title}>
          Kesar
        </Text>
        <Gu style={styles.titleGu}>કેસર</Gu>
      </View>

      <View style={styles.stage}>
        <Kesar key={`${pose}-${bump}`} pose={pose} size={240} />
      </View>
      <Text style={styles.about}>
        A Gir lion, from the forest where Gujarat's lions live. He's named after kesar: saffron, the colour of his mane,
        and the Gir Kesar mango that grows in the same forest. Tap him to say hello, and keep tapping for tricks.
      </Text>

      <Text weight="black" style={styles.section}>
        Around the app
      </Text>
      {chips(MOODS)}
      <Text weight="black" style={styles.section}>
        Just for fun
      </Text>
      {chips(FUN)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  title: { fontSize: 24 },
  titleGu: { fontSize: 20, color: colors.muted },
  stage: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
  },
  about: { fontSize: 14, color: colors.muted, lineHeight: 20, marginVertical: 14 },
  section: { fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.lineDark,
    backgroundColor: colors.card,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 14 },
});
