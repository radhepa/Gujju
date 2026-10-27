import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Gu } from '../ui/Text';
import {
  BOX,
  BREATH_MS,
  BREATH_SX,
  BREATH_SY,
  CLIPS,
  FIDGETS,
  PARALLAX,
  TRICKS,
  RIG,
  densify,
  findNode,
  rank,
  visible,
  withDefs,
  type Clip,
  type Pose,
  type RigNode,
} from './rig';

export type { Pose } from './rig';

// Kesar (કેસર), the Gir lion. A layered SVG rig: every part is its own view
// turning on its own joint, so poses are just data in rig.ts.

const native = Platform.OS !== 'web';
const VB = `${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`;
const origin = ([x, y]: [number, number]) =>
  `${((x - BOX.x) / BOX.w) * 100}% ${((y - BOX.y) / BOX.h) * 100}%`;

// Gradient and clip ids are global to the page on the web, and a screen
// left mounted underneath (hidden) would otherwise own "k-coat": every
// Kesar on top would then lose his colours. So each part gets its own ids.
let partSeq = 0;

const Part = memo(function Part({ svg, size }: { svg: string; size: number }) {
  const uid = useMemo(() => `k${(++partSeq).toString(36)}-`, []);
  const xml = useMemo(
    () =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}">${withDefs(svg)}</svg>`
        .replace(/id="k-/g, `id="${uid}`)
        .replace(/url\(#k-/g, `url(#${uid}`),
    [svg, uid],
  );
  return <SvgXml xml={xml} width={size} height={size} />;
});

interface Drivers {
  clock: Animated.Value;
  breath: Animated.Value;
  blink: Animated.Value;
  gaze: Animated.ValueXY;
}

function curve(
  driver: Animated.Value,
  values: number[],
  at?: number[],
  map: (v: number) => number | string = (v) => v,
) {
  const { input, output } = densify(values, at);
  return driver.interpolate({ inputRange: input, outputRange: output.map(map) as number[] | string[] });
}

function transformsFor(node: RigNode, clip: Clip, d: Drivers, k: number) {
  const base = node.opacity;
  if (node.follow) node = { ...findNode(node.follow)!, id: node.follow };
  const tr = clip.tracks[node.id] ?? {};
  const t: Record<string, unknown>[] = [];
  const at = tr.at;
  if (tr.x) t.push({ translateX: curve(d.clock, tr.x, at, (v) => v * k) });
  if (tr.y) t.push({ translateY: curve(d.clock, tr.y, at, (v) => v * k) });
  const para = PARALLAX[node.id];
  if (para) {
    // Features slide with the gaze, so the head seems to turn toward it.
    const [lx, ly] = clip.face.look ?? [0, 0];
    const move = (v: Animated.Animated, rest: number, f: number) =>
      Animated.add(v, rest).interpolate({ inputRange: [-10, 10], outputRange: [-10 * f * k, 10 * f * k] });
    t.push({ translateX: move(d.gaze.x, lx, para[0]) });
    t.push({ translateY: move(d.gaze.y, ly, para[1]) });
  }
  if (tr.rotate) t.push({ rotate: curve(d.clock, tr.rotate, at, (v) => `${v}deg`) });
  if (tr.sx) t.push({ scaleX: curve(d.clock, tr.sx, at) });
  if (tr.sy) t.push({ scaleY: curve(d.clock, tr.sy, at) });
  if (node.id === 'breath') {
    t.push({ scaleX: curve(d.breath, BREATH_SX) });
    t.push({ scaleY: curve(d.breath, BREATH_SY) });
  }
  if (node.id === 'eyeL' || node.id === 'eyeR') t.push({ scaleY: d.blink });
  return { transform: t, opacity: tr.opacity ? curve(d.clock, tr.opacity, at) : base };
}

function Node({ node, clip, d, size }: { node: RigNode; clip: Clip; d: Drivers; size: number }) {
  if (!visible(node, clip)) return null;
  const { transform, opacity } = transformsFor(node, clip, d, size / BOX.w);
  const kids = [...(node.children ?? [])].sort((a, b) => rank(a, clip) - rank(b, clip));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { transformOrigin: origin((node.follow ? findNode(node.follow)?.pivot : node.pivot) ?? [130, 130]), transform: transform as never, opacity },
      ]}
    >
      {node.svg ? <Part svg={node.svg} size={size} /> : null}
      {kids.map((c) => (
        <Node key={`${c.id}-${c.when?.effect ?? c.when?.prop ?? ''}`} node={c} clip={clip} d={d} size={size} />
      ))}
    </Animated.View>
  );
}

// Any of these but the one he just did.
const pick = (from: Pose[], not?: Pose) => {
  const pool = from.filter((p) => p !== not);
  return pool[Math.floor(Math.random() * pool.length)];
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export function Kesar({
  pose = 'idle',
  size = 120,
  reaction,
  reactionKey,
  tappable = true,
  greetOnMount = false,
  style,
}: {
  pose?: Pose;
  size?: number;
  // Plays once over `pose` whenever `reactionKey` changes.
  reaction?: Pose;
  reactionKey?: number | string;
  // Tap and he waves; tap again for a trick.
  tappable?: boolean;
  greetOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState<{ pose: Pose; n: number } | null>(greetOnMount ? { pose: 'wave', n: 0 } : null);
  const active: Pose = playing?.pose ?? pose;
  const clip = CLIPS[active];

  const d = useRef<Drivers>({
    clock: new Animated.Value(0),
    breath: new Animated.Value(0),
    blink: new Animated.Value(1),
    gaze: new Animated.ValueXY({ x: 0, y: 0 }),
  }).current;
  const box = useRef<View>(null);

  // A reaction from the screen (right/wrong answer, lesson done).
  useEffect(() => {
    if (reaction) setPlaying((p) => ({ pose: reaction, n: (p?.n ?? 0) + 1 }));
  }, [reaction, reactionKey]);

  // Left idle a while, he amuses himself: a stretch, a wash, a sneeze.
  useEffect(() => {
    if (reduced || playing || pose !== 'idle') return;
    const timer = setTimeout(() => setPlaying({ pose: pick(FIDGETS), n: 0 }), 14000 + Math.random() * 16000);
    return () => clearTimeout(timer);
  }, [pose, playing, reduced]);

  // The clip clock.
  useEffect(() => {
    d.clock.setValue(0);
    if (reduced) {
      d.clock.setValue(0.3);
      return;
    }
    const run = Animated.timing(d.clock, { toValue: 1, duration: clip.ms, easing: Easing.linear, useNativeDriver: native });
    if (playing) {
      // Reactions play once (short loops a few times), then hand back to the pose.
      const times = clip.loop ? Math.max(1, Math.round(1800 / clip.ms)) : 1;
      const anim = Animated.loop(run, { iterations: times, resetBeforeIteration: true });
      anim.start(({ finished }) => finished && setPlaying(null));
      return () => anim.stop();
    }
    const anim = clip.loop ? Animated.loop(run) : run;
    anim.start();
    return () => anim.stop();
  }, [active, playing?.n, clip, d, playing, reduced]);

  // Breathing, always.
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.loop(
      Animated.timing(d.breath, { toValue: 1, duration: BREATH_MS, easing: Easing.linear, useNativeDriver: native }),
    );
    anim.start();
    return () => anim.stop();
  }, [d, reduced]);

  // Blinking at random.
  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(d.blink, { toValue: 0.1, duration: 70, useNativeDriver: native }),
          Animated.timing(d.blink, { toValue: 1, duration: 110, useNativeDriver: native }),
        ]).start(next);
      }, 2200 + Math.random() * 3200);
    };
    next();
    return () => clearTimeout(timer);
  }, [d, reduced]);

  // Eyes follow the pointer on the web, and wander a little on a phone.
  useEffect(() => {
    if (reduced) return;
    if (Platform.OS === 'web') {
      const onMove = (e: PointerEvent) => {
        const el = box.current as unknown as HTMLElement | null;
        if (!el?.getBoundingClientRect) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(r.width * 2, 200);
        const dy = (e.clientY - (r.top + r.height * 0.45)) / Math.max(r.height * 2, 200);
        d.gaze.setValue({ x: Math.max(-1, Math.min(1, dx)) * 3, y: Math.max(-1, Math.min(1, dy)) * 2.5 });
      };
      window.addEventListener('pointermove', onMove);
      return () => window.removeEventListener('pointermove', onMove);
    }
    let timer: ReturnType<typeof setTimeout>;
    const wander = () => {
      timer = setTimeout(() => {
        const look = Math.random() < 0.4 ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 3 };
        Animated.timing(d.gaze, { toValue: look, duration: 220, useNativeDriver: native }).start(wander);
      }, 2500 + Math.random() * 3500);
    };
    wander();
    return () => clearTimeout(timer);
  }, [d, reduced]);

  // The first tap says hello; after that every tap gets a different trick.
  const taps = useRef(0);
  const tap = () => {
    const next = taps.current++ ? pick(TRICKS, playing?.pose) : 'wave';
    setPlaying((p) => ({ pose: next, n: (p?.n ?? 0) + 1 }));
  };
  const showBubble = !!clip.bubble && size >= 56;

  return (
    <Pressable
      onPress={tappable ? tap : undefined}
      disabled={!tappable}
      accessibilityRole="image"
      accessibilityLabel="Kesar the lion"
      style={style}
    >
      <View ref={box} style={{ width: size, height: size }}>
        <Node node={RIG} clip={clip} d={d} size={size} />
        {showBubble && <Bubble key={clip.bubble} text={clip.bubble!} size={size} />}
      </View>
    </Pressable>
  );
}

function Bubble({ text, size }: { text: string; size: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: native }).start();
  }, [pop]);
  const u = size / BOX.w;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          left: (160 - BOX.x) * u,
          top: (-18 - BOX.y) * u,
          minWidth: 104 * u,
          height: 44 * u,
          borderRadius: 20 * u,
          borderWidth: Math.max(1.5, 3 * u),
          transformOrigin: '10% 100%',
          transform: [{ scale: pop }],
        },
      ]}
    >
      <Gu style={{ fontSize: 20 * u, lineHeight: 30 * u, paddingHorizontal: 10 * u }}>{text}</Gu>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderColor: '#7A3D14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
