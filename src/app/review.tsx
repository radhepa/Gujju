import { useCallback, useState } from 'react';
import { course } from '../content/course';
import { buildReview } from '../lib/exercises';
import type { Summary } from '../lib/session';
import { SessionComplete } from '../session/SessionComplete';
import { SessionPlayer } from '../session/SessionPlayer';
import { useProgress } from '../state/progress';
import { goBack } from '../ui/nav';
import { Notice } from '../ui/Notice';

// Keep a session short; anything left over is still due afterwards.
const MAX_PER_SESSION = 20;

export default function ReviewScreen() {
  const { dueIds, learnedIds, snapshot, finishSession, streak } = useProgress();
  // Fix the set of cards when the screen opens, so finishing doesn't rebuild it.
  const [exercises] = useState(() =>
    buildReview(course, dueIds.slice(0, MAX_PER_SESSION), learnedIds, {
      alwaysShowTranslit: snapshot.settings.alwaysShowTranslit,
    }),
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const onFinish = useCallback(
    (s: Summary) => {
      setSummary(s);
      finishSession(s, 'review', []).catch((e) => console.warn('Save failed', e));
    },
    [finishSession],
  );

  if (summary) {
    const left = dueIds.length;
    return (
      <SessionComplete
        title="Reviews done!"
        subtitle={left ? `${left} more still due today.` : 'All caught up for today.'}
        summary={summary}
        streak={streak.days}
        onContinue={goBack}
      />
    );
  }

  if (!exercises.length) return <Notice title="Nothing to review" body="Come back tomorrow." />;

  return <SessionPlayer exercises={exercises} onFinish={onFinish} onClose={goBack} />;
}
