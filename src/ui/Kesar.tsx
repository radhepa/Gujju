import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import sheet from './kesarFrames.json';

// Kesar (કેસર), the Gir lion. Named for saffron, his turban, and the Gir
// Kesar mango, which grows in the same forest as Gujarat's lions.
// One sprite strip (scripts/slice-mascot.py), stepped through by shifting it.

const STRIP = require('../../assets/mascot/kesar.png');

export type Pose = 'idle' | 'wave' | 'cheer' | 'read' | 'eat' | 'walk';

const POSES: Record<Pose, { frames: string[]; fps: number; motion: 'breathe' | 'bounce' | 'bob' }> = {
  idle: { frames: ['idle'], fps: 1, motion: 'breathe' },
  wave: { frames: ['wave-2', 'wave-3'], fps: 4, motion: 'bob' },
  cheer: { frames: ['cheer-1', 'cheer-2'], fps: 4, motion: 'bounce' },
  read: { frames: ['read-1', 'read-1', 'read-2'], fps: 1.5, motion: 'breathe' },
  eat: { frames: ['eat'], fps: 1, motion: 'breathe' },
  walk: { frames: ['walk-1', 'walk-2'], fps: 4, motion: 'bob' },
};

const native = Platform.OS !== 'web';

export function Kesar({
  pose = 'idle',
  size = 96,
  // Waves for a moment when tapped, then goes back to `pose`.
  tappable = true,
  greetOnMount = false,
  style,
}: {
  pose?: Pose;
  size?: number;
  tappable?: boolean;
  greetOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [waving, setWaving] = useState(greetOnMount);
  const current = waving ? 'wave' : pose;
  const { frames, fps, motion } = POSES[current];
  const [tick, setTick] = useState(0);
  const move = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (greetOnMount) timer.current = setTimeout(() => setWaving(false), 2400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [greetOnMount]);

  useEffect(() => {
    setTick(0);
    if (frames.length < 2) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000 / fps);
    return () => clearInterval(t);
  }, [current, frames.length, fps]);

  useEffect(() => {
    const ms = motion === 'bounce' ? 250 : motion === 'bob' ? 250 : 1400;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(move, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(move, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [motion, move]);

  const index = sheet.frames.indexOf(frames[tick % frames.length]);
  const transform =
    motion === 'breathe'
      ? [{ translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.012] }) },
         { scaleY: move.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) }]
      : motion === 'bounce'
        ? [{ translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.08] }) }]
        : [{ translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.02] }) }];

  const wave = () => {
    if (!tappable) return;
    if (timer.current) clearTimeout(timer.current);
    setWaving(true);
    timer.current = setTimeout(() => setWaving(false), 2000);
  };

  return (
    <Pressable
      onPress={wave}
      disabled={!tappable}
      accessibilityRole="image"
      accessibilityLabel="Kesar the lion"
      style={style}
    >
      <Animated.View style={[{ width: size, height: size }, styles.clip, { transform }]}>
        <View style={{ width: size, height: size, overflow: 'hidden' }}>
          <Image
            source={STRIP}
            style={{
              width: size * sheet.frames.length,
              height: size,
              transform: [{ translateX: -index * size }],
            }}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'visible' },
});
