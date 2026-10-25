import { lessonsInUnit } from '../content/course';
import { dayKey, startOfTomorrow } from './dates';
import type { Summary } from './session';
import { deferred, review, scheduler } from './srs';
import {
  LOCAL_USER,
  type CardRow,
  type Course,
  type DailyStatRow,
  type Lesson,
  type LessonProgressRow,
  type ReviewLogRow,
  type Snapshot,
  type Unit,
} from './types';

export const NEW_PER_DAY = 20;
export const TEST_OUT_PASS = 0.8;

export interface UnitStatus {
  unit: Unit;
  lessons: Lesson[];
  done: number;
  open: boolean;
  finished: boolean;
  next?: Lesson;
}

// A unit opens when the one before it is finished. Any unfinished unit can
// be skipped with a test-out quiz.
export function unitStatuses(course: Course, completed: Set<string>): UnitStatus[] {
  let prevFinished = true;
  return course.units.map((unit) => {
    const lessons = lessonsInUnit(course, unit.id);
    const done = lessons.filter((l) => completed.has(l.id)).length;
    const finished = done === lessons.length;
    const status: UnitStatus = {
      unit,
      lessons,
      done,
      open: prevFinished || finished,
      finished,
      next: lessons.find((l) => !completed.has(l.id)),
    };
    prevFinished = finished;
    return status;
  });
}

// The script used to be four units in alphabet order (u01 to u04). It is now
// five units in order of use (s01 to s05), with new lesson ids. Anyone who
// finished the old script has met every letter, so it counts as done.
const OLD_SCRIPT = [
  ...['u01-l1', 'u01-l2', 'u01-l3', 'u01-l4'],
  ...[1, 2, 3, 4, 5].flatMap((n) => [`u02-l${n}`, `u03-l${n}`, `u04-l${n}`]),
];
const NEW_SCRIPT = ['s01', 's02', 's03', 's04', 's05'];

// Finished lessons as the path sees them: stored rows for lessons that still
// exist, plus the new script for anyone who finished the old one.
export function completedLessons(course: Course, lessonIds: string[]): Set<string> {
  const stored = new Set(lessonIds);
  const known = new Set(course.lessons.map((l) => l.id));
  const done = new Set(lessonIds.filter((id) => known.has(id)));
  if (OLD_SCRIPT.every((id) => stored.has(id))) {
    for (const l of course.lessons) if (NEW_SCRIPT.includes(l.unitId)) done.add(l.id);
  }
  return done;
}

export function isLessonOpen(course: Course, completed: Set<string>, lessonId: string): boolean {
  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) return false;
  const status = unitStatuses(course, completed).find((s) => s.unit.id === lesson.unitId)!;
  if (!status.open) return false;
  // Within a unit, lessons go in order, but finished ones can be replayed.
  return completed.has(lessonId) || status.next?.id === lessonId;
}

// practice: a round of sentence cloze (from a collection or a book). It
// keeps its own cards and doesn't use the course's new-item budget.
export type SessionKind = 'lesson' | 'review' | 'test-out' | 'practice';

export interface StatDelta {
  xp: number;
  lessonsDone: number;
  reviewsDone: number;
  newItems: number;
}

export interface Changes {
  date: string;
  cards: CardRow[];
  logs: ReviewLogRow[];
  lessonProgress: LessonProgressRow[];
  stats: StatDelta;
}

export interface ApplyOptions {
  kind: SessionKind;
  // Lessons this session completes (one for a lesson, a whole unit for a
  // passed test-out, none for a review).
  lessonIds: string[];
  now: Date;
}

export function applySession(snap: Snapshot, summary: Summary, opts: ApplyOptions): Changes {
  const { now, kind } = opts;
  const date = dayKey(now);
  const at = now.toISOString();
  const f = scheduler(snap.settings.retention);
  const cardsById = new Map(snap.cards.map((c) => [c.itemId, c]));
  const today = snap.dailyStats.find((s) => s.date === date);
  const practice = kind === 'practice';
  let newBudget = practice ? Infinity : Math.max(0, NEW_PER_DAY - (today?.newItems ?? 0));

  const cards: CardRow[] = [];
  const logs: ReviewLogRow[] = [];
  let newItems = 0;

  for (const [itemId, grade] of Object.entries(summary.grades)) {
    const prev = cardsById.get(itemId);
    if (!prev && newBudget === 0) {
      cards.push(deferred(itemId, startOfTomorrow(now)));
      continue;
    }
    if (!prev) {
      newBudget--;
      if (!practice) newItems++;
    }
    cards.push(review(f, itemId, prev, grade, now));
    logs.push({ userId: LOCAL_USER, itemId, rating: grade, reviewedAt: at });
  }

  const prevBest = new Map(snap.lessonProgress.map((p) => [p.lessonId, p.bestAccuracy]));
  const lessonProgress = opts.lessonIds.map((lessonId) => ({
    userId: LOCAL_USER,
    lessonId,
    completedAt: at,
    bestAccuracy: Math.max(prevBest.get(lessonId) ?? 0, summary.accuracy),
  }));

  return {
    date,
    cards,
    logs,
    lessonProgress,
    stats: {
      xp: summary.xp,
      lessonsDone: kind === 'review' || practice ? 0 : 1,
      // A practice round keeps the streak alive the same way a review does.
      reviewsDone: kind === 'review' || practice ? 1 : 0,
      newItems,
    },
  };
}

export function mergeStat(prev: DailyStatRow | undefined, date: string, d: StatDelta): DailyStatRow {
  return {
    userId: prev?.userId ?? LOCAL_USER,
    date,
    xp: (prev?.xp ?? 0) + d.xp,
    lessonsDone: (prev?.lessonsDone ?? 0) + d.lessonsDone,
    reviewsDone: (prev?.reviewsDone ?? 0) + d.reviewsDone,
    newItems: (prev?.newItems ?? 0) + d.newItems,
  };
}

// Apply changes to an in-memory snapshot (what the UI holds).
export function applyChanges(snap: Snapshot, ch: Changes): Snapshot {
  const cards = new Map(snap.cards.map((c) => [c.itemId, c]));
  for (const c of ch.cards) cards.set(c.itemId, c);
  const lp = new Map(snap.lessonProgress.map((p) => [p.lessonId, p]));
  for (const p of ch.lessonProgress) lp.set(p.lessonId, p);
  const prev = snap.dailyStats.find((s) => s.date === ch.date);
  return {
    ...snap,
    cards: [...cards.values()],
    lessonProgress: [...lp.values()],
    dailyStats: [...snap.dailyStats.filter((s) => s.date !== ch.date), mergeStat(prev, ch.date, ch.stats)],
  };
}
