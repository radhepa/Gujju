import { Rating } from 'ts-fsrs';
import { splitAksharas } from '../lib/aksharas';
import { course } from '../content/course';
import { currentLevel, stages } from '../lib/level';
import { makeRng } from '../lib/rng';
import { review, scheduler } from '../lib/srs';
import type { Item } from '../lib/types';
import { backspace, buildWriteRound, isWriteCard, KEYBOARD, letterTiles, writableWords, writeCardId } from '../lib/write';

const word = (id: string, gujarati: string, english = id): Item => ({ id, type: 'word', gujarati, translit: id, english, audioFile: null });

describe('writing practice', () => {
  const words = [word('ghar', 'ઘર'), word('paaNee', 'પાણી'), word('chaa', 'ચા'), word('roTlee', 'રોટલી'), word('dhanyavaad', 'ધન્યવાદ')];

  it('uses single words only', () => {
    const items = [...words, word('kem-chho', 'કેમ છો'), { ...word('l-ka', 'ક'), type: 'letter' as const }];
    expect(writableWords(items).map((w) => w.id)).toEqual(words.map((w) => w.id));
  });

  it('gives the word’s own tiles plus up to three tempting spares', () => {
    for (const w of words) {
      const tiles = letterTiles(w.gujarati, makeRng(w.id));
      const own = splitAksharas(w.gujarati);
      for (const a of own) expect(tiles).toContain(a);
      expect(tiles.length).toBeGreaterThan(own.length);
      expect(tiles.length).toBeLessThanOrEqual(own.length + 3);
      expect(new Set(tiles).size).toBe(tiles.length);
    }
  });

  it('starts new learners on the first words, and puts due spellings first', () => {
    const now = new Date(2026, 9, 14);
    const fresh = buildWriteRound(words, new Set(), new Map(), now, makeRng(1), 3);
    expect(fresh).toHaveLength(3);

    const learned = new Set(words.map((w) => w.id));
    const due = review(scheduler(0.9), writeCardId('roTlee'), undefined, Rating.Good, new Date(2026, 8, 1));
    const later = { ...review(scheduler(0.9), writeCardId('ghar'), undefined, Rating.Good, now), due: new Date(2027, 0, 1).toISOString() };
    const rows = new Map([
      [due.itemId, due],
      [later.itemId, later],
    ]);
    const round = buildWriteRound(words, learned, rows, now, makeRng(1), 2);
    expect(round.map((w) => w.id)).toContain('roTlee');
    expect(round.map((w) => w.id)).not.toContain('ghar');
  });

  it('has a card prefix of its own, and a full keyboard', () => {
    expect(isWriteCard(writeCardId('ghar'))).toBe(true);
    expect(KEYBOARD.consonants).toHaveLength(34);
    expect(backspace('ઘર')).toBe('ઘ');
    expect(backspace('પા')).toBe('પ');
  });
});

describe('level', () => {
  const units = (n: number) => new Set(course.units.slice(0, n).map((u) => u.id));

  it('is Pre-A1 with nothing done', () => {
    expect(currentLevel({ unitsDone: new Set(), practiceSeen: new Map(), watched: 0 }).reached).toBe('Pre-A1');
  });

  it('reaches A1 after units 1 to 15 and half of Everyday', () => {
    const r = currentLevel({ unitsDone: units(15), practiceSeen: new Map([['everyday', 0.6]]), watched: 0 });
    expect(r.reached).toBe('A1');
    expect(r.next?.code).toBe('A2');
  });

  it('needs every stage in order', () => {
    // A2 work done but A1's collection skipped: still Pre-A1.
    const r = currentLevel({ unitsDone: units(26), practiceSeen: new Map([['out-and-about', 1]]), watched: 5 });
    expect(r.reached).toBe('Pre-A1');
  });

  it('reaches B1 with everything', () => {
    const seen = new Map([
      ['everyday', 1],
      ['out-and-about', 1],
      ['conversations', 0.6],
      ['book:kesar-market', 1],
      ['book:thirsty-crow', 1],
      ['book:letter-to-ba', 1],
    ]);
    expect(currentLevel({ unitsDone: units(course.units.length), practiceSeen: seen, watched: 3 }).reached).toBe('B1');
    expect(stages({ unitsDone: units(course.units.length), practiceSeen: seen, watched: 3 }).every((s) => s.milestones.every((m) => m.done))).toBe(true);
  });
});
