import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { course } from '../../content/course';
import { dailyMix, glyphCatalog, gradeGlyph, letterCardId, letterSets, MIX_ID, questionContext, type LetterSet } from '../../lib/letters';
import { makeRng } from '../../lib/rng';
import type { Summary } from '../../lib/session';
import type { CardRow } from '../../lib/types';
import { LetterSprint, type SprintResult } from '../../practice/LetterSprint';
import { SprintResults } from '../../practice/SprintResults';
import { useProgress } from '../../state/progress';
import { goBack } from '../../ui/nav';
import { Notice } from '../../ui/Notice';

const catalog = glyphCatalog(course);
const glyphs = new Map(catalog.map((g) => [g.id, g]));

interface Done {
  result: SprintResult;
  xp: number;
  prevBest: number;
  before: Map<string, CardRow>;
}

// One letter challenge round, then its results. "Play again" starts a fresh
// round on the same set.
export default function LetterRound() {
  const { set: setId } = useLocalSearchParams<{ set: string }>();
  const { snapshot, cardRows, learnedIds, finishSession, updateSettings } = useProgress();
  const { letterTimed: timed, letterBest } = snapshot.settings;
  // Fixed when the screen opens, so finishing a round doesn't reshuffle it.
  const [set] = useState<LetterSet | undefined>(() =>
    setId === MIX_ID
      ? { id: MIX_ID, title: 'Daily mix', titleGu: 'આજનું મિશ્રણ', blurb: '', sample: '', glyphs: dailyMix(catalog, cardRows, new Set(learnedIds), new Date()) }
      : letterSets(catalog).find((s) => s.id === setId),
  );
  const [game, setGame] = useState(0);
  const [startRows, setStartRows] = useState(cardRows);
  const [done, setDone] = useState<Done | null>(null);
  const best = set ? (letterBest[set.id] ?? 0) : 0;

  const ctx = useMemo(() => {
    if (!set) return null;
    // Vowel signs go on consonants you've met in lessons, when there are enough.
    const met = learnedIds.filter((id) => glyphs.get(id)?.kind === 'consonant');
    return questionContext(catalog, set, makeRng(Date.now() + game), met);
    // A new context for each game only, not each time a card is saved.
  }, [set, game]);

  const onFinish = useCallback(
    (result: SprintResult) => {
      if (!set) return;
      const total = result.right + result.wrong;
      const xp = Math.max(result.right ? 1 : 0, Math.round(result.score / 20));
      setDone({ result, xp, prevBest: best, before: startRows });
      // Nothing answered, nothing to save (and no free streak day).
      if (!total) return;
      const grades = Object.fromEntries(Object.entries(result.round.tally).map(([id, t]) => [letterCardId(id), gradeGlyph(t)]));
      const summary: Summary = { xp, correctFirstTry: result.right, total, accuracy: result.right / total, grades };
      finishSession(summary, 'practice', []).catch((e) => console.warn('Save failed', e));
      if (timed && result.score > best) updateSettings({ letterBest: { ...letterBest, [set.id]: result.score } });
    },
    [set, best, startRows, timed, letterBest, finishSession, updateSettings],
  );

  if (!set || !ctx) return <Notice title="Letter set not found" />;

  if (done) {
    return (
      <SprintResults
        result={done.result}
        timed={timed}
        prevBest={done.prevBest}
        xp={done.xp}
        glyphs={glyphs}
        before={done.before}
        after={cardRows}
        onAgain={() => {
          setStartRows(cardRows);
          setDone(null);
          setGame((g) => g + 1);
        }}
        onDone={goBack}
      />
    );
  }

  return (
    <LetterSprint
      key={game}
      title={set.title}
      pool={set.glyphs}
      ctx={ctx}
      rows={startRows}
      timed={timed}
      best={best}
      onFinish={onFinish}
      onClose={goBack}
    />
  );
}
