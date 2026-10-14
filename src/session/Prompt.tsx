import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';

// The thing being asked about, with its transliteration underneath when the
// lesson allows it (or behind a tap when the lesson is fading it out).
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
  return (
    <View style={styles.wrap}>
      {gujarati ? (
        <Gu style={[styles.gu, big && styles.guBig]}>{text}</Gu>
      ) : (
        <Text weight="black" style={styles.latin}>
          {text}
        </Text>
      )}
      {translit &&
        (hint && !revealed ? (
          <Pressable onPress={() => setRevealed(true)} style={styles.hintPill} accessibilityRole="button">
            <Text weight="bold" style={styles.hintText}>
              Show transliteration
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.translit}>{translit}</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  gu: { fontSize: 34, lineHeight: 56, textAlign: 'center' },
  guBig: { fontSize: 84, lineHeight: 128 },
  latin: { fontSize: 28, textAlign: 'center' },
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
