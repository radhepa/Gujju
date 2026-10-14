import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { course, lessonsInUnit } from '../../content/course';
import { buildTestOut } from '../../lib/exercises';
import { TEST_OUT_PASS } from '../../lib/progress';
import type { Summary } from '../../lib/session';
import { SessionComplete } from '../../session/SessionComplete';
import { SessionPlayer } from '../../session/SessionPlayer';
import { useProgress } from '../../state/progress';
import { goBack } from '../../ui/nav';
import { Notice } from '../../ui/Notice';

// Pass with 80% right on the first try and the whole unit is marked done.
export default function TestOutScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const { snapshot, finishSession, streak } = useProgress();
  const unit = course.units.find((u) => u.id === unitId);
  const [exercises] = useState(() =>
    unit ? buildTestOut(course, unit.id, { seed: Date.now(), alwaysShowTranslit: snapshot.settings.alwaysShowTranslit }) : [],
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const onFinish = useCallback(
    (s: Summary) => {
      setSummary(s);
      if (!unit) return;
      const passed = s.accuracy >= TEST_OUT_PASS;
      // A failed attempt still earns its XP, but nothing gets scheduled.
      const result = passed ? s : { ...s, grades: {} };
      const lessons = passed ? lessonsInUnit(course, unit.id).map((l) => l.id) : [];
      finishSession(result, 'test-out', lessons).catch((e) => console.warn('Save failed', e));
    },
    [unit, finishSession],
  );

  if (!unit) return <Notice title="Unit not found" />;

  if (summary) {
    const passed = summary.accuracy >= TEST_OUT_PASS;
    return (
      <SessionComplete
        title={passed ? `Unit ${unit.order} skipped!` : 'Not quite yet'}
        subtitle={
          passed
            ? `${unit.title} is marked done and its items are in your reviews.`
            : `You need ${Math.round(TEST_OUT_PASS * 100)}% right on the first try. The lessons are still there.`
        }
        summary={summary}
        streak={streak.days}
        onContinue={goBack}
      />
    );
  }

  return <SessionPlayer exercises={exercises} onFinish={onFinish} onClose={goBack} />;
}
