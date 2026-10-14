import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

type Variant = 'primary' | 'green' | 'red' | 'plain';

const palette: Record<Variant, { bg: string; edge: string; fg: string }> = {
  primary: { bg: colors.primary, edge: colors.primaryDark, fg: '#fff' },
  green: { bg: colors.green, edge: colors.greenDark, fg: '#fff' },
  red: { bg: colors.red, edge: colors.redDark, fg: '#fff' },
  plain: { bg: colors.card, edge: colors.lineDark, fg: colors.ink },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = disabled ? { bg: colors.line, edge: colors.lineDark, fg: colors.muted } : palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={style}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            {
              backgroundColor: p.bg,
              borderBottomColor: p.edge,
              borderColor: variant === 'plain' ? p.edge : p.bg,
              borderBottomWidth: pressed ? 2 : 4,
              marginTop: pressed ? 2 : 0,
            },
          ]}
        >
          <Text weight="black" style={[styles.label, { color: p.fg }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  label: { fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
});
