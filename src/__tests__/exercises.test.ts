import { course } from '../content/course';
import {
  buildLesson,
  buildReview,
  buildTestOut,
  isBuildCorrect,
  LESSON_MAX,
  LESSON_MIN,
} from '../lib/exercises';
import type { BuildExercise, Exercise, PickExercise } from '../lib/types';

const counted = (ex: Exercise[]) => ex.filter((e) => e.kind !== 'intro');

describe('buildLesson', () => {
  it.each(course.lessons.map((l) => [l.id]))('%s has 10 to 12 exercises', (id) => {
    const ex = counted(buildLesson(course, id));
    expect(ex.length).toBeGreaterThanOrEqual(LESSON_MIN);
    expect(ex.length).toBeLessThanOrEqual(LESSON_MAX);
  });

  it.each(course.lessons.map((l) => [l.id]))('%s tests every new item', (id) => {
    const lesson = course.lessons.find((l) => l.id === id)!;
    const tested = new Set(counted(buildLesson(course, id)).flatMap((e) => e.itemIds));
    for (const item of lesson.items) expect(tested).toContain(item);
  });

  it('is the same every time for the same seed', () => {
    expect(buildLesson(course, 'u01-l1', { seed: 7 })).toEqual(buildLesson(course, 'u01-l1', { seed: 7 }));
  });

  it('introduces each new letter before testing it', () => {
    const ex = buildLesson(course, 'u01-l1');
    for (const id of ['l-a', 'l-aa', 'l-i', 'l-ee']) {
      const introAt = ex.findIndex((e) => e.kind === 'intro' && e.itemIds[0] === id);
      const firstTest = ex.findIndex((e) => e.kind !== 'intro' && e.itemIds.includes(id));
      expect(introAt).toBeGreaterThanOrEqual(0);
      expect(introAt).toBeLessThan(firstTest);
    }
  });

  it('gives multiple choice four distinct options including the answer', () => {
    for (const l of course.lessons) {
      for (const e of buildLesson(course, l.id)) {
        if (e.kind !== 'pick-sound' && e.kind !== 'pick-letter') continue;
        const p = e as PickExercise;
        expect(p.options).toHaveLength(4);
        expect(new Set(p.options).size).toBe(4);
        expect(p.options).toContain(p.answer);
      }
    }
  });

  it('prefers confusable letters as wrong answers', () => {
    // ઇ and ઈ are both in lesson 1, so ઈ should always tempt you on ઇ
    for (let seed = 0; seed < 20; seed++) {
      const ex = buildLesson(course, 'u01-l1', { seed });
      const q = ex.find((e) => e.kind === 'pick-sound' && e.itemIds[0] === 'l-i') as PickExercise;
      expect(q.options).toContain('ee');
    }
  });

  it('build-word tiles contain the answer', () => {
    const ex = buildLesson(course, 'u03-l5').filter((e) => e.kind === 'build-word') as BuildExercise[];
    expect(ex.length).toBeGreaterThan(0);
    for (const b of ex) {
      const tiles = b.tiles.slice();
      for (const a of b.answer) {
        const i = tiles.indexOf(a);
        expect(i).toBeGreaterThanOrEqual(0);
        tiles.splice(i, 1);
      }
      expect(tiles.length).toBeGreaterThan(0);
    }
  });
});

describe('isBuildCorrect', () => {
  const ex: BuildExercise = {
    id: 'x',
    kind: 'build-sentence',
    itemIds: ['s'],
    question: '',
    prompt: '',
    promptIsGujarati: true,
    tilesAreGujarati: false,
    tiles: [],
    answer: ['I', 'am', 'at', 'home'],
    alts: [['I', 'am', 'home']],
  };

  it('accepts the answer regardless of case', () => {
    expect(isBuildCorrect(ex, ['i', 'am', 'at', 'home'])).toBe(true);
  });

  it('accepts listed alternatives', () => {
    expect(isBuildCorrect(ex, ['I', 'am', 'home'])).toBe(true);
  });

  it('rejects the wrong order', () => {
    expect(isBuildCorrect(ex, ['am', 'I', 'at', 'home'])).toBe(false);
  });
});

describe('buildTestOut', () => {
  it.each(course.units.map((u) => [u.id]))('%s has a full quiz with no intros', (id) => {
    const ex = buildTestOut(course, id);
    expect(ex).toHaveLength(LESSON_MAX);
    expect(ex.some((e) => e.kind === 'intro')).toBe(false);
  });
});

describe('buildReview', () => {
  it('makes one exercise per due item', () => {
    const due = ['l-a', 'l-ka', 'w-ghar'];
    const learned = course.lessons.slice(0, 14).flatMap((l) => l.items);
    const ex = buildReview(course, due, learned, { seed: 1 });
    expect(ex).toHaveLength(3);
    expect(ex.flatMap((e) => e.itemIds).sort()).toEqual([...due].sort());
  });
});
