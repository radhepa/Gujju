import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { course } from '../content/course';
import { unitStatuses, type UnitStatus } from '../lib/progress';
import { useProgress } from '../state/progress';
import { Button } from '../ui/Button';
import { Kesar } from '../ui/Kesar';
import { Screen } from '../ui/Screen';
import { Gu, Text } from '../ui/Text';
import { colors, shadow } from '../ui/theme';

export default function Home() {
  const { completed, streak, xpToday, dueIds, learnedIds, snapshot } = useProgress();
  const statuses = unitStatuses(course, completed);
  const best = new Map(snapshot.lessonProgress.map((p) => [p.lessonId, p.bestAccuracy]));
  const current = statuses.find((s) => s.open && !s.finished)?.unit.id;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isOpen = (s: UnitStatus) => expanded[s.unit.id] ?? s.unit.id === current;

  return (
    <Screen>
      <View style={styles.header}>
        <Kesar size={64} greetOnMount style={styles.mascot} />
        <View style={{ flex: 1 }}>
          <Text weight="black" style={styles.brand}>
            Gujju
          </Text>
          <Gu style={styles.brandGu}>ગુજરાતી શીખો</Gu>
        </View>
        <View style={styles.pills}>
          <Pill icon="flame" color={streak.doneToday ? colors.primary : colors.locked} label={String(streak.days)} />
          <Pill icon="flash" color={colors.teal} label={`${xpToday} XP`} />
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings" hitSlop={8}>
            <Ionicons name="settings-sharp" size={22} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.review, shadow]}>
        <Kesar size={56} pose={dueIds.length ? 'read' : 'eat'} />
        <View style={{ flex: 1 }}>
          <Text weight="black" style={styles.reviewCount}>
            {dueIds.length ? `${dueIds.length} ${dueIds.length === 1 ? 'review' : 'reviews'} due` : 'No reviews due'}
          </Text>
          <Text style={styles.reviewSub}>
            {learnedIds.length === 0
              ? 'Finish a lesson to start your review queue.'
              : dueIds.length
                ? 'Clearing them counts toward your streak.'
                : `${learnedIds.length} items in your queue. Come back tomorrow.`}
          </Text>
        </View>
        {dueIds.length > 0 && <Button label="Review" variant="green" onPress={() => router.push('/review')} />}
      </View>

      {statuses.map((s) => (
        <UnitCard
          key={s.unit.id}
          status={s}
          expanded={isOpen(s)}
          best={best}
          completed={completed}
          onToggle={() => setExpanded((e) => ({ ...e, [s.unit.id]: !isOpen(s) }))}
        />
      ))}
    </Screen>
  );
}

function Pill({ icon, color, label }: { icon: 'flame' | 'flash'; color: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={18} color={color} />
      <Text weight="black" style={{ color, fontSize: 15 }}>
        {label}
      </Text>
    </View>
  );
}

function UnitCard({
  status,
  expanded,
  best,
  completed,
  onToggle,
}: {
  status: UnitStatus;
  expanded: boolean;
  best: Map<string, number>;
  completed: Set<string>;
  onToggle: () => void;
}) {
  const { unit, lessons, done, open, finished, next } = status;
  const band = finished ? colors.green : open ? colors.primary : colors.locked;

  return (
    <View style={[styles.unit, shadow]}>
      <Pressable onPress={onToggle} style={[styles.unitHead, { backgroundColor: band }]} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text weight="bold" style={styles.unitKicker}>
            Unit {unit.order}
          </Text>
          <Text weight="black" style={styles.unitTitle}>
            {unit.title}
          </Text>
        </View>
        {finished ? (
          <Ionicons name="checkmark-circle" size={26} color="#fff" />
        ) : open ? (
          <Text weight="black" style={styles.unitCount}>
            {done}/{lessons.length}
          </Text>
        ) : (
          <Ionicons name="lock-closed" size={22} color="#fff" />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.unitBody}>
          <Text style={styles.tip}>{unit.tip}</Text>
          {lessons.map((l) => {
            const isDone = completed.has(l.id);
            const isNext = open && next?.id === l.id;
            const playable = open && (isDone || isNext);
            return (
              <Pressable
                key={l.id}
                disabled={!playable}
                onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: l.id } })}
                style={({ pressed }) => [styles.lesson, isNext && styles.lessonNext, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`Lesson ${l.order}: ${l.title}`}
              >
                <View
                  style={[
                    styles.node,
                    { backgroundColor: isDone ? colors.green : isNext ? colors.primary : colors.line },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Text weight="black" style={{ color: isNext ? '#fff' : colors.locked }}>
                      {l.order}
                    </Text>
                  )}
                </View>
                {/[\u0A80-\u0AFF]/.test(l.title) ? (
                  <Gu bold={isNext} style={[styles.lessonTitle, styles.lessonGu, !playable && { color: colors.locked }]}>
                    {l.title}
                  </Gu>
                ) : (
                  <Text weight={isNext ? 'black' : 'bold'} style={[styles.lessonTitle, !playable && { color: colors.locked }]}>
                    {l.title}
                  </Text>
                )}
                {isDone && best.has(l.id) ? (
                  <Text style={styles.lessonBest}>{Math.round(best.get(l.id)! * 100)}%</Text>
                ) : isNext ? (
                  <Text weight="black" style={styles.start}>
                    START
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          {!finished && (
            <Pressable
              onPress={() => router.push({ pathname: '/test-out/[unitId]', params: { unitId: unit.id } })}
              style={styles.testOut}
              accessibilityRole="button"
            >
              <Ionicons name="play-skip-forward" size={16} color={colors.teal} />
              <Text weight="bold" style={styles.testOutText}>
                Already know this? Test out
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  mascot: { marginLeft: -8 },
  brand: { fontSize: 28, color: colors.primaryDark, lineHeight: 32 },
  brandGu: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 18,
  },
  reviewCount: { fontSize: 18 },
  reviewSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  unit: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    marginBottom: 14,
    overflow: 'hidden',
  },
  unitHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  unitKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  unitTitle: { color: '#fff', fontSize: 20 },
  unitCount: { color: '#fff', fontSize: 16 },
  unitBody: { padding: 12, gap: 4 },
  tip: { fontSize: 14, color: colors.muted, lineHeight: 20, paddingHorizontal: 4, paddingBottom: 8 },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12 },
  lessonNext: { backgroundColor: colors.primarySoft },
  node: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lessonTitle: { flex: 1, fontSize: 16 },
  lessonGu: { fontSize: 17 },
  lessonBest: { fontSize: 13, color: colors.muted },
  start: { fontSize: 13, color: colors.primaryDark, letterSpacing: 0.8 },
  testOut: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, marginTop: 4 },
  testOutText: { color: colors.teal, fontSize: 14 },
});
