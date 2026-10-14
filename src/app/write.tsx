import { useCallback, useState } from 'react';
import { course } from '../content/course';
import { makeRng } from '../lib/rng';
import type { Summary } from '../lib/session';
import { buildWriteRound, writableWords } from '../lib/write';
import { WritePlayer } from '../practice/WritePlayer';
import { SessionComplete } from '../session/SessionComplete';
import { useProgress } from '../state/progress';
import { goBack } from '../ui/nav';
import { Notice } from '../ui/Notice';

// Writing practice. Uses the words you've learned in lessons; before any,
// it starts with the first words of the course.
export default function WriteScreen() {
  const { snapshot, cardRows, learnedIds, finishSession, streak, updateSettings } = useProgress();
  const [round] = useState(() =>
    buildWriteRound(writableWords([...new Set(course.lessons.flatMap((l) => l.items))].map((id) => course.items[id]).filter(Boolean)), new Set(learnedIds), cardRows, new Date(), makeRng(Date.now())),
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const onFinish = useCallback(
    (s: Summary) => {
      setSummary(s);
      finishSession(s, 'practice', []).catch((e) => console.warn('Save failed', e));
    },
    [finishSession],
  );

  if (summary) {
    return <SessionComplete title="Nicely written!" subtitle="Each word comes back for spelling on its own schedule." summary={summary} streak={streak.days} onContinue={goBack} />;
  }
  if (!round.length) return <Notice title="No words to write yet" body="Finish a lesson with words in it first." pose="think" />;
  return (
    <WritePlayer
      words={round}
      mode={snapshot.settings.writeMode}
      onMode={(writeMode) => updateSettings({ writeMode })}
      onFinish={onFinish}
      onClose={goBack}
    />
  );
}
