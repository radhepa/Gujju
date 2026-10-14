import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gu, Text } from '../ui/Text';
import { colors } from '../ui/theme';

export type TileState = 'idle' | 'selected' | 'correct' | 'wrong' | 'done' | 'ghost';

const look: Record<TileState, { bg: string; border: string; fg: string }> = {
  idle: { bg: colors.card, border: colors.lineDark, fg: colors.ink },
  selected: { bg: colors.tealSoft, border: colors.teal, fg: colors.teal },
  correct: { bg: colors.greenSoft, border: colors.green, fg: colors.greenDark },
  wrong: { bg: colors.redSoft, border: colors.red, fg: colors.redDark },
  done: { bg: colors.bg, border: colors.line, fg: colors.locked },
  ghost: { bg: colors.line, border: colors.line, fg: 'transparent' },
};

export function Tile({
  label,
  gujarati,
  state = 'idle',
  onPress,
  disabled,
  size = 'md',
  badge,
  style,
}: {
  label: string;
  gujarati: boolean;
  state?: TileState;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  badge?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const l = look[state];
  const fontSize = gujarati ? { sm: 22, md: 26, lg: 40 }[size] : { sm: 16, md: 18, lg: 20 }[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || state === 'done' || state === 'ghost'}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={style}
    >
      <View
        style={[
          styles.tile,
          size === 'lg' && styles.lg,
          size === 'sm' && styles.sm,
          { backgroundColor: l.bg, borderColor: l.border, borderBottomColor: state === 'idle' ? colors.lineDark : l.border },
        ]}
      >
        {badge && state !== 'ghost' ? (
          <Text weight="bold" style={styles.badge}>
            {badge}
          </Text>
        ) : null}
        {gujarati ? (
          <Gu style={{ fontSize, lineHeight: fontSize * 1.55, color: l.fg }}>{label}</Gu>
        ) : (
          <Text weight="bold" style={{ fontSize, color: l.fg }}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  lg: { minHeight: 96, paddingVertical: 10 },
  sm: { minHeight: 44, paddingHorizontal: 12 },
  badge: { position: 'absolute', top: 6, left: 9, fontSize: 11, color: colors.locked },
});
