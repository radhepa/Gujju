import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

const native = Platform.OS !== 'web';

// "5 in a row": a flame by the progress bar that pops each time the run
// grows. Hidden until there's a run worth showing.
export function Combo({ count, min = 3 }: { count: number; min?: number }) {
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (count < min) return;
    pop.setValue(1.45);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: native }).start();
  }, [count, min, pop]);
  if (count < min) return null;
  const hot = count >= 10;
  return (
    <Animated.View style={[styles.combo, hot && styles.hot, { transform: [{ scale: pop }] }]} accessibilityLabel={`${count} in a row`}>
      <Ionicons name="flame" size={18} color={hot ? '#fff' : colors.primary} />
      <Text weight="black" style={[styles.text, hot && { color: '#fff' }]}>
        {count}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  combo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  hot: { backgroundColor: colors.primary },
  text: { color: colors.primaryDark, fontSize: 15 },
});
