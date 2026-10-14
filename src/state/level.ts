import { useMemo } from 'react';
import { course } from '../content/course';
import { clozeContext, practiceSources } from '../content/library';
import { cardsFor, sourceStats } from '../lib/cloze';
import { currentLevel, stages } from '../lib/level';
import { unitStatuses } from '../lib/progress';
import { makeRng } from '../lib/rng';
import { useProgress } from './progress';

// The learner's CEFR estimate, worked out from progress (see lib/level).
export function useLevel() {
  const { completed, cardRows, snapshot } = useProgress();
  return useMemo(() => {
    const unitsDone = new Set(
      unitStatuses(course, completed)
        .filter((s) => s.finished && s.lessons.length > 0)
        .map((s) => s.unit.id),
    );
    const now = new Date();
    const rng = makeRng(1);
    const practiceSeen = new Map(
      practiceSources(snapshot.books).map((src) => {
        const st = sourceStats(cardsFor(src, clozeContext(), rng), cardRows, now);
        return [src.id, st.total ? st.seen / st.total : 0];
      }),
    );
    const input = { unitsDone, practiceSeen, watched: snapshot.settings.watched.length };
    return { ...currentLevel(input), stages: stages(input) };
  }, [completed, cardRows, snapshot.books, snapshot.settings.watched]);
}
