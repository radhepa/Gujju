import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { course } from '../../content/course';
import { buildLesson } from '../../lib/exercises';
import { isLessonOpen } from '../../lib/progress';
import type { Summary } from '../../lib/session';
import { SessionComplete } from '../../session/SessionComplete';
import { SessionPlayer } from '../../session/SessionPlayer';
import { useProgress } from '../../state/progress';
import { goBack } from '../../ui/nav';
import { Notice } from '../../ui/Notice';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { completed, snapshot, finishSession, streak } = useProgress();
  const lesson = course.lessons.find((l) => l.id === id);
  // Build once per visit. A new seed each time means a replay isn't identical.
  const [seed] = useState(() => Date.now());
  const exercises = useMemo(
    () => (lesson ? buildLesson(course, lesson.id, { seed, alwaysShowTranslit: snapshot.settings.alwaysShowTranslit }) : []),
    [lesson?.id, seed],
  );
  const [summary, setSummary] = useState<Summary | null>(null);
  // Whether this run was the first time through, read before finishing marks it done.
  const [firstTime, setFirstTime] = useState(false);

  const onFinish = useCallback(
    (s: Summary) => {
      setFirstTime(!!lesson && !completed.has(lesson.id));
      setSummary(s);
      if (lesson) finishSession(s, 'lesson', [lesson.id]).catch((e) => console.warn('Save failed', e));
    },
    [lesson, completed, finishSession],
  );

  if (!lesson || (!summary && !isLessonOpen(course, completed, lesson.id))) {
    return <Notice title="This lesson isn't open yet" body="Finish the lessons before it first." />;
  }

  if (summary) {
    const unit = course.units.find((u) => u.id === lesson.unitId)!;
    const items = lesson.items.map((i) => course.items[i]).filter(Boolean);
    return (
      <SessionComplete
        title="Lesson complete!"
        subtitle={`${unit.title} · ${lesson.title}`}
        summary={summary}
        streak={streak.days}
        onContinue={() => goBack()}
        words={items.length ? { label: firstTime ? 'New in your reviews' : 'In this lesson', items } : undefined}
      />
    );
  }

  return <SessionPlayer exercises={exercises} onFinish={onFinish} onClose={() => goBack()} />;
}
