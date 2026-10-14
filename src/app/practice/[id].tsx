import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { clozeContext, findSource } from '../../content/library';
import { buildRound, cardsFor } from '../../lib/cloze';
import { makeRng } from '../../lib/rng';
import type { Summary } from '../../lib/session';
import { ClozePlayer } from '../../practice/ClozePlayer';
import { SessionComplete } from '../../session/SessionComplete';
import { useProgress } from '../../state/progress';
import { goBack } from '../../ui/nav';
import { Notice } from '../../ui/Notice';

export default function PracticeRound() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, cardRows, finishSession, streak } = useProgress();
  const source = findSource(String(id), snapshot.books);
  // Fix the round when the screen opens, so saving progress doesn't reshuffle it.
  const [round] = useState(() => {
    if (!source) return [];
    const rng = makeRng(Date.now());
    return buildRound(cardsFor(source, clozeContext(), rng), cardRows, new Date(), rng);
  });
  const [summary, setSummary] = useState<Summary | null>(null);

  const onFinish = useCallback(
    (s: Summary) => {
      setSummary(s);
      finishSession(s, 'practice', []).catch((e) => console.warn('Save failed', e));
    },
    [finishSession],
  );

  if (!source) return <Notice title="Can't find that" body="This collection or book doesn't exist any more." pose="think" />;
  if (summary) {
    return (
      <SessionComplete
        title="Round done!"
        subtitle={source.titleGu ? `${source.title} · ${source.titleGu}` : source.title}
        summary={summary}
        streak={streak.days}
        onContinue={goBack}
      />
    );
  }
  if (!round.length) {
    return (
      <Notice
        title="Nothing to practise here yet"
        body="Add a few sentences with two or more words and come back."
        pose="think"
      />
    );
  }
  return <ClozePlayer cards={round} mode={snapshot.settings.clozeMode} onFinish={onFinish} onClose={goBack} />;
}
