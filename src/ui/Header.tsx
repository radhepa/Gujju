import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { goBack } from './nav';
import { Gu, Text } from './Text';
import { colors } from './theme';

// Back arrow, a title (with an optional Gujarati subtitle) and room for a
// button on the right.
export function Header({ title, titleGu, right }: { title: string; titleGu?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={goBack} accessibilityLabel="Back" hitSlop={12}>
        <Ionicons name="arrow-back" size={26} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text weight="black" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {titleGu ? <Gu style={styles.gu}>{titleGu}</Gu> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  title: { fontSize: 24 },
  gu: { fontSize: 15, color: colors.muted, lineHeight: 22 },
});
