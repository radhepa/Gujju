import { Rating } from 'ts-fsrs';
import { current, gradeFor, isFinished, startSession, submit, summarize } from '../lib/session';
import type { Exercise } from '../lib/types';

const pickEx = (id: string, item: string): Exercise => ({
  id,
  kind: 'pick-sound',
  itemIds: [item],
  question: '',
  prompt: '',
  optionsAreGujarati: false,
  options: [],
  answer: '',
});

const introEx = (id: string, item: string): Exercise => ({
  id,
  kind: 'intro',
  itemIds: [item],
  item: { id: item, type: 'letter', gujarati: '', translit: '', english: '', audioFile: null },
});

describe('session', () => {
  it('moves a missed exercise to the end until it is answered right', () => {
    let s = startSession([pickEx('a', 'x'), pickEx('b', 'y')]);
    s = submit(s, { correct: false });
    expect(current(s)?.id).toBe('b');
    s = submit(s, { correct: true });
    expect(current(s)?.id).toBe('a#1');
    s = submit(s, { correct: false });
    expect(current(s)?.id).toBe('a#2');
    s = submit(s, { correct: true });
    expect(isFinished(s)).toBe(true);
    expect(s.done).toBe(2);
  });

  it('gives 10 XP per exercise right on the first try', () => {
    let s = startSession([pickEx('a', 'x'), pickEx('b', 'y'), pickEx('c', 'z')]);
    s = submit(s, { correct: true });
    s = submit(s, { correct: false });
    s = submit(s, { correct: true });
    s = submit(s, { correct: true }); // retry of b
    const sum = summarize(s);
    expect(sum.xp).toBe(20);
    expect(sum.accuracy).toBeCloseTo(2 / 3);
  });

  it('does not count intro cards', () => {
    let s = startSession([introEx('i', 'x'), pickEx('a', 'x')]);
    expect(s.total).toBe(1);
    s = submit(s, { correct: true });
    s = submit(s, { correct: true });
    expect(summarize(s)).toMatchObject({ xp: 10, total: 1, accuracy: 1 });
  });

  it('grades items by how many times they were missed', () => {
    let s = startSession([pickEx('a', 'x'), pickEx('b', 'y'), pickEx('c', 'z')]);
    s = submit(s, { correct: true }); // x right first time
    s = submit(s, { correct: false }); // y wrong once
    s = submit(s, { correct: false }); // z wrong
    s = submit(s, { correct: true }); // y right on retry
    s = submit(s, { correct: false }); // z wrong again
    s = submit(s, { correct: true }); // z finally right
    expect(summarize(s).grades).toEqual({ x: Rating.Good, y: Rating.Hard, z: Rating.Again });
  });

  it('charges only the mismatched items in match pairs', () => {
    const match: Exercise = {
      id: 'm',
      kind: 'match-pairs',
      itemIds: ['x', 'y', 'z'],
      pairs: [],
    };
    let s = startSession([match]);
    s = submit(s, { correct: false, missed: ['y'] });
    s = submit(s, { correct: true });
    expect(summarize(s).grades).toEqual({ x: Rating.Good, y: Rating.Hard, z: Rating.Good });
  });

  it('maps misses to FSRS ratings', () => {
    expect(gradeFor(0)).toBe(Rating.Good);
    expect(gradeFor(1)).toBe(Rating.Hard);
    expect(gradeFor(2)).toBe(Rating.Again);
    expect(gradeFor(5)).toBe(Rating.Again);
  });
});
