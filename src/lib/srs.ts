import { createEmptyCard, fsrs, generatorParameters, type Card, type FSRS, type Grade } from 'ts-fsrs';
import { endOfDay } from './dates';
import { LOCAL_USER, type CardRow } from './types';

// FSRS via ts-fsrs. Short-term learning steps are off: this is a once-a-day
// app, so the shortest interval should be a day, not ten minutes.

export function scheduler(retention: number): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: retention,
      enable_fuzz: true,
      enable_short_term: false,
    }),
  );
}

export function toCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.lastReview ? new Date(row.lastReview) : undefined,
  };
}

export function fromCard(itemId: string, c: Card, userId = LOCAL_USER): CardRow {
  return {
    userId,
    itemId,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.toISOString() : null,
  };
}

export function review(f: FSRS, itemId: string, prev: CardRow | undefined, grade: Grade, now: Date): CardRow {
  const card = prev ? toCard(prev) : createEmptyCard(now);
  return fromCard(itemId, f.next(card, now, grade).card, prev?.userId);
}

// A card that's been taught but not scheduled yet, because the day's new
// item cap was reached. It shows up in tomorrow's reviews as a new card.
export function deferred(itemId: string, due: Date): CardRow {
  return fromCard(itemId, createEmptyCard(due));
}

export function isDue(row: CardRow, now: Date): boolean {
  return new Date(row.due).getTime() <= endOfDay(now).getTime();
}

export function dueCards(rows: CardRow[], now: Date): CardRow[] {
  return rows.filter((r) => isDue(r, now)).sort((a, b) => a.due.localeCompare(b.due));
}
