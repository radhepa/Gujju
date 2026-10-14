import { Rating } from 'ts-fsrs';
import { course } from '../content/course';
import { applyChanges, applySession, isLessonOpen, NEW_PER_DAY, unitStatuses } from '../lib/progress';
import type { Summary } from '../lib/session';
import { dueCards, review, scheduler } from '../lib/srs';
import { DEFAULT_SETTINGS, type Snapshot } from '../lib/types';

const empty: Snapshot = { lessonProgress: [], cards: [], dailyStats: [], settings: DEFAULT_SETTINGS };
const now = new Date(2026, 9, 14, 9, 0);

const summary = (grades: Summary['grades'], accuracy = 1): Summary => ({
  xp: 100,
  correctFirstTry: 10,
  total: 10,
  accuracy,
  grades,
});

describe('unit unlocking', () => {
  it('opens only the first unit at the start', () => {
    const s = unitStatuses(course, new Set());
    expect(s[0].open).toBe(true);
    expect(s.slice(1).every((u) => !u.open)).toBe(true);
    expect(s[0].next?.id).toBe('u01-l1');
  });

  it('opens the next unit once a unit is finished', () => {
    const done = new Set(course.lessons.filter((l) => l.unitId === 'u01').map((l) => l.id));
    const s = unitStatuses(course, done);
    expect(s[0].finished).toBe(true);
    expect(s[1].open).toBe(true);
    expect(s[2].open).toBe(false);
  });

  it('plays lessons in order but allows replays', () => {
    const done = new Set(['u01-l1']);
    expect(isLessonOpen(course, done, 'u01-l1')).toBe(true);
    expect(isLessonOpen(course, done, 'u01-l2')).toBe(true);
    expect(isLessonOpen(course, done, 'u01-l3')).toBe(false);
    expect(isLessonOpen(course, done, 'u02-l1')).toBe(false);
  });
});

describe('applySession', () => {
  it('schedules new items and records the lesson', () => {
    const ch = applySession(empty, summary({ 'l-a': Rating.Good, 'l-aa': Rating.Hard }), {
      kind: 'lesson',
      lessonIds: ['u01-l1'],
      now,
    });
    expect(ch.cards).toHaveLength(2);
    expect(ch.logs).toHaveLength(2);
    expect(ch.lessonProgress[0]).toMatchObject({ lessonId: 'u01-l1', bestAccuracy: 1 });
    expect(ch.stats).toEqual({ xp: 100, lessonsDone: 1, reviewsDone: 0, newItems: 2 });
    // Nothing is due again the same day: short-term steps are off.
    expect(dueCards(ch.cards, now)).toHaveLength(0);
  });

  it('spaces Good further out than Hard, and Hard further than Again', () => {
    const ch = applySession(empty, summary({ g: Rating.Good, h: Rating.Hard, a: Rating.Again }), {
      kind: 'lesson',
      lessonIds: [],
      now,
    });
    const due = (id: string) => new Date(ch.cards.find((c) => c.itemId === id)!.due).getTime();
    expect(due('g')).toBeGreaterThanOrEqual(due('h'));
    expect(due('h')).toBeGreaterThanOrEqual(due('a'));
  });

  it(`defers new items past ${NEW_PER_DAY} a day to tomorrow`, () => {
    const grades: Summary['grades'] = {};
    for (let i = 0; i < NEW_PER_DAY + 5; i++) grades[`i${i}`] = Rating.Good;
    const ch = applySession(empty, summary(grades), { kind: 'lesson', lessonIds: [], now });
    expect(ch.stats.newItems).toBe(NEW_PER_DAY);
    expect(ch.logs).toHaveLength(NEW_PER_DAY);
    const tomorrow = new Date(2026, 9, 15).toISOString();
    expect(ch.cards.filter((c) => c.due === tomorrow)).toHaveLength(5);
  });

  it('counts the cap across sessions in the same day', () => {
    const snap: Snapshot = {
      ...empty,
      dailyStats: [{ userId: 'local', date: '2026-10-14', xp: 0, lessonsDone: 1, reviewsDone: 0, newItems: 18 }],
    };
    const ch = applySession(snap, summary({ a: Rating.Good, b: Rating.Good, c: Rating.Good }), {
      kind: 'lesson',
      lessonIds: [],
      now,
    });
    expect(ch.stats.newItems).toBe(2);
  });

  it('reviews existing cards instead of creating new ones', () => {
    const f = scheduler(0.9);
    const card = review(f, 'l-a', undefined, Rating.Good, new Date(2026, 9, 1));
    const snap = { ...empty, cards: [card] };
    const ch = applySession(snap, summary({ 'l-a': Rating.Good }), { kind: 'review', lessonIds: [], now });
    expect(ch.stats).toMatchObject({ reviewsDone: 1, lessonsDone: 0, newItems: 0 });
    expect(ch.cards[0].reps).toBe(2);
  });

  it('keeps the best accuracy for a replayed lesson', () => {
    const snap: Snapshot = {
      ...empty,
      lessonProgress: [{ userId: 'local', lessonId: 'u01-l1', completedAt: '', bestAccuracy: 0.9 }],
    };
    const ch = applySession(snap, summary({}, 0.5), { kind: 'lesson', lessonIds: ['u01-l1'], now });
    expect(ch.lessonProgress[0].bestAccuracy).toBe(0.9);
  });

  it('merges changes into a snapshot', () => {
    const ch = applySession(empty, summary({ 'l-a': Rating.Good }), { kind: 'lesson', lessonIds: ['u01-l1'], now });
    const once = applyChanges(empty, ch);
    const twice = applyChanges(once, ch);
    expect(twice.cards).toHaveLength(1);
    expect(twice.dailyStats).toHaveLength(1);
    expect(twice.dailyStats[0]).toMatchObject({ xp: 200, lessonsDone: 2 });
  });
});

describe('retention setting', () => {
  it('schedules shorter intervals at higher retention', () => {
    const at = new Date(2026, 9, 1);
    const low = review(scheduler(0.8), 'x', undefined, Rating.Good, at);
    const high = review(scheduler(0.97), 'x', undefined, Rating.Good, at);
    expect(new Date(high.due).getTime()).toBeLessThan(new Date(low.due).getTime());
  });
});
