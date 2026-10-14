import { Rating, type Grade } from 'ts-fsrs';
import type { Exercise } from './types';

// A lesson or review in progress. Missed exercises go to the back of the
// queue and come around again until they're answered right. There are no
// hearts: a miss only costs the retry.

export const XP_PER_EXERCISE = 10;

export interface Session {
  queue: Exercise[];
  index: number;
  // Exercises that count (intros don't).
  total: number;
  done: number;
  firstTry: Record<string, boolean>;
  misses: Record<string, number>;
}

const baseId = (id: string) => id.split('#')[0];
const counts = (e: Exercise) => e.kind !== 'intro';

export function startSession(exercises: Exercise[]): Session {
  return {
    queue: exercises,
    index: 0,
    total: exercises.filter(counts).length,
    done: 0,
    firstTry: {},
    misses: {},
  };
}

export function current(s: Session): Exercise | undefined {
  return s.queue[s.index];
}

export function isFinished(s: Session): boolean {
  return s.index >= s.queue.length;
}

export interface Answer {
  correct: boolean;
  // Items that were got wrong. Defaults to all the exercise's items;
  // match pairs passes just the ones that were mismatched.
  missed?: string[];
}

export function submit(s: Session, a: Answer): Session {
  const ex = current(s);
  if (!ex) return s;
  const id = baseId(ex.id);
  const firstTry = { ...s.firstTry };
  const misses = { ...s.misses };
  const queue = s.queue.slice();
  let done = s.done;

  if (counts(ex)) {
    if (!(id in firstTry)) firstTry[id] = a.correct;
    if (!a.correct || a.missed?.length) {
      for (const item of a.missed ?? ex.itemIds) misses[item] = (misses[item] ?? 0) + 1;
    }
    if (a.correct) {
      done++;
    } else {
      const tries = queue.filter((e) => baseId(e.id) === id).length;
      queue.push({ ...ex, id: `${id}#${tries}` });
    }
  }

  return { ...s, queue, index: s.index + 1, done, firstTry, misses };
}

// wrong twice or more = Again, right after one retry = Hard, right first time = Good
export function gradeFor(misses: number): Grade {
  if (misses === 0) return Rating.Good;
  if (misses === 1) return Rating.Hard;
  return Rating.Again;
}

export interface Summary {
  xp: number;
  correctFirstTry: number;
  total: number;
  accuracy: number;
  grades: Record<string, Grade>;
}

export function summarize(s: Session): Summary {
  const correctFirstTry = Object.values(s.firstTry).filter(Boolean).length;
  const grades: Record<string, Grade> = {};
  for (const ex of s.queue) {
    if (!counts(ex)) continue;
    for (const item of ex.itemIds) grades[item] = gradeFor(s.misses[item] ?? 0);
  }
  return {
    xp: correctFirstTry * XP_PER_EXERCISE,
    correctFirstTry,
    total: s.total,
    accuracy: s.total ? correctFirstTry / s.total : 1,
    grades,
  };
}
