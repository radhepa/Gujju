import { Pressable, StyleSheet, View } from 'react-native';
import { pieces, words } from '../lib/text';
import { Gu, Text } from './Text';
import { colors } from './theme';

export interface Blank {
  index: number;
  // What to show in the gap: nothing yet, or the answer once it's checked.
  reveal?: { word: string; correct: boolean };
}

// A Gujarati sentence drawn word by word, each word tappable for its
// meaning, with the transliteration of each word underneath when asked.
export function SentenceView({
  gu,
  tr,
  showTranslit,
  blank,
  size = 26,
  onWord,
}: {
  gu: string;
  tr?: string;
  showTranslit?: boolean;
  blank?: Blank;
  size?: number;
  onWord?: (word: string) => void;
}) {
  const ps = pieces(gu);
  const tw = tr ? words(tr) : [];
  const aligned = tw.length === ps.length;
  const line = Math.round(size * 1.55);

  return (
    <View style={styles.wrap}>
      {ps.map((p, i) => {
        const isBlank = blank?.index === i;
        const sub = showTranslit && aligned && (!isBlank || blank?.reveal) ? tw[i] : '';
        if (isBlank && !blank?.reveal) {
          return (
            <View key={i} style={styles.word}>
              <View style={styles.gapRow}>
                {p.before ? <Gu style={{ fontSize: size, lineHeight: line }}>{p.before}</Gu> : null}
                <View style={[styles.gap, { height: line, minWidth: size * 2.6 }]} />
                {p.after ? <Gu style={{ fontSize: size, lineHeight: line }}>{p.after}</Gu> : null}
              </View>
              {showTranslit ? <Text style={styles.tr}> </Text> : null}
            </View>
          );
        }
        const shown = isBlank ? blank!.reveal!.word : p.word;
        const tint = isBlank ? (blank!.reveal!.correct ? colors.greenDark : colors.redDark) : colors.ink;
        return (
          <Pressable
            key={i}
            onPress={onWord ? () => onWord(p.word) : undefined}
            disabled={!onWord}
            style={({ pressed }) => [styles.word, pressed && styles.pressed]}
            accessibilityRole={onWord ? 'button' : undefined}
            accessibilityHint={onWord ? 'Shows what this word means' : undefined}
          >
            <Gu style={{ fontSize: size, lineHeight: line, color: tint }} bold={isBlank}>
              {p.before}
              <Gu style={[isBlank && styles.hit, { fontSize: size, lineHeight: line, color: tint }]} bold={isBlank}>
                {shown}
              </Gu>
              {p.after}
            </Gu>
            {showTranslit ? <Text style={styles.tr}>{sub || ' '}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 6, alignItems: 'flex-start' },
  word: { alignItems: 'center', borderRadius: 8, paddingHorizontal: 2 },
  pressed: { backgroundColor: colors.primarySoft },
  gapRow: { flexDirection: 'row', alignItems: 'flex-end' },
  gap: { borderBottomWidth: 3, borderColor: colors.primary },
  hit: { textDecorationLine: 'underline' },
  tr: { fontSize: 13, color: colors.muted, marginTop: -4 },
});
