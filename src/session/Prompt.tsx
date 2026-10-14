import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Kesar } from '../mascot/Kesar';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';

// The thing being asked about, with its transliteration underneath when the
// lesson allows it (or behind a tap when the lesson is fading it out).
// English prompts come from Kesar in a speech bubble; Gujarati ones stand
// alone and large, since the script is the thing being read.
export function Prompt({
  text,
  gujarati,
  translit,
  hint,
  big,
}: {
  text: string;
  gujarati: boolean;
  translit?: string;
  hint?: boolean;
  big?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const sub =
    translit &&
    (hint && !revealed ? (
      <Pressable onPress={() => setRevealed(true)} style={styles.hintPill} accessibilityRole="button">
        <Text weight="bold" style={styles.hintText}>
          Show transliteration
        </Text>
      </Pressable>
    ) : (
      <Text style={styles.translit}>{translit}</Text>
    ));

  if (!gujarati) {
    return (
      <View style={styles.speaker}>
        <Kesar size={88} />
        <View style={styles.bubble}>
          <Text weight="black" style={styles.bubbleText}>
            {text}
          </Text>
          {sub}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Gu style={[styles.gu, big && styles.guBig]}>{text}</Gu>
      {sub}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  gu: { fontSize: 34, lineHeight: 56, textAlign: 'center' },
  guBig: { fontSize: 84, lineHeight: 128 },
  speaker: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 4 },
  bubble: {
    flexShrink: 1,
    minWidth: 76,
    alignItems: 'center',
    gap: 4,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
  translit: { fontSize: 18, color: colors.muted },
  hintPill: {
    borderWidth: 1.5,
    borderColor: colors.lineDark,
    borderStyle: 'dashed',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  hintText: { fontSize: 13, color: colors.muted },
});
