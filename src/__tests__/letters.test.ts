import { Rating } from 'ts-fsrs';
import { course } from '../content/course';
import { isPracticeCard } from '../lib/cloze';
import {
  dailyMix,
  glyphCatalog,
  gradeGlyph,
  isLetterCard,
  letterCardId,
  letterSets,
  lookalikesOf,
  makeQuestion,
  masteryOf,
  multiplier,
  newRound,
  nextGlyph,
  points,
  questionContext,
  record,
  syllable,
} from '../lib/letters';
import { makeRng } from '../lib/rng';
import { review, scheduler } from '../lib/srs';

const catalog = glyphCatalog(course);
const byId = new Map(catalog.map((g) => [g.id, g]));
const sets = letterSets(catalog);

describe('letter catalogue', () => {
  it('has every letter the course teaches, and the ten digits', () => {
    const letters = Object.values(course.items).filter((i) => i.type === 'letter');
    for (const l of letters) expect(byId.has(l.id)).toBe(true);
    expect(catalog.filter((g) => g.kind === 'digit').map((g) => g.sound)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('sorts into vowels, consonants and signs in chart order', () => {
    const shapes = (k: string) => catalog.filter((g) => g.kind === k).map((g) => g.shape);
    expect(shapes('vowel').slice(0, 4)).toEqual(['અ', 'આ', 'ઇ', 'ઈ']);
    expect(shapes('consonant').slice(0, 4)).toEqual(['ક', 'ખ', 'ગ', 'ઘ']);
    expect(shapes('sign')).toContain('◌ી');
    expect(byId.get('s-kee')).toMatchObject({ sign: 'ી', sound: 'ee' });
    expect(byId.get('s-k-halant')).toMatchObject({ sign: '્', sound: '' });
  });

  it('builds syllables the way they’re read', () => {
    const c = (id: string) => byId.get(id)!;
    expect(syllable(c('l-ga'), c('s-kee'))).toEqual({ shape: 'ગી', sound: 'gee' });
    expect(syllable(c('l-chha'), c('s-ko'))).toEqual({ shape: 'છો', sound: 'chho' });
    expect(syllable(c('l-tta'), c('s-ku'))).toEqual({ shape: 'ટુ', sound: 'Tu' });
    expect(syllable(c('l-ga'), c('s-k-halant'))).toEqual({ shape: 'ગ્', sound: 'g' });
    expect(syllable(c('l-ga'), null)).toEqual({ shape: 'ગ', sound: 'ga' });
  });

  it('only pairs lookalikes you can tell apart by sound', () => {
    const shapes = (id: string) => lookalikesOf(byId.get(id)!, byId).map((g) => g.shape);
    expect(shapes('l-gha')).toContain('ધ');
    expect(shapes('l-ssa')).not.toContain('શ');
    const look = sets.find((s) => s.id === 'lookalikes')!;
    expect(look.glyphs.length).toBeGreaterThan(20);
  });
});

describe('letter questions', () => {
  it('always offers the answer once, with no two options that mean the same', () => {
    for (const set of sets) {
      const rng = makeRng(set.id);
      const ctx = questionContext(catalog, set, rng);
      for (let n = 0; n < 300; n++) {
        const g = byId.get(set.glyphs[n % set.glyphs.length])!;
        const q = makeQuestion(g, ctx, n);
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
        expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(4);
        for (const o of q.options) expect(q.other[o]).toBeDefined();
        if (set.lookalikes) {
          const allowed = [g, ...lookalikesOf(g, byId)];
          if (g.kind !== 'sign') for (const o of q.options) expect(allowed.some((a) => a.shape === o || a.sound === o)).toBe(true);
        }
      }
    }
  });

  it('keeps the consonant fixed in a barakhadi question, so only the sign can be wrong', () => {
    const set = sets.find((s) => s.id === 'signs')!;
    const ctx = questionContext(catalog, set, makeRng(3), ['l-ga', 'l-ma', 'l-na']);
    for (let n = 0; n < 50; n++) {
      const q = makeQuestion(byId.get(set.glyphs[n % set.glyphs.length])!, ctx, n);
      const shapes = q.kind === 'find' ? q.options : [q.prompt];
      const first = [...shapes[0]][0];
      expect(['ગ', 'મ', 'ન']).toContain(first);
      for (const s of shapes) expect([...s][0]).toBe(first);
    }
  });
});

describe('a round', () => {
  it('doesn’t ask the same letter twice in a row, and brings misses back', () => {
    const pool = ['l-ka', 'l-kha', 'l-ga', 'l-gha', 'l-dha'];
    const rng = makeRng(9);
    let s = newRound();
    let last = '';
    for (let i = 0; i < 40; i++) {
      const id = nextGlyph(pool, s, new Map(), rng);
      expect(id).not.toBe(last);
      last = id;
      s = record(s, id, id !== 'l-gha', 1000, 'ધ');
    }
    expect(s.tally['l-gha'].wrong).toBeGreaterThan(5);
    expect(s.tally['l-gha'].picked).toContain('ધ');
    expect(nextGlyph(['l-ka'], newRound(), new Map(), rng)).toBe('l-ka');
  });

  it('scores combos and quick answers', () => {
    expect([1, 4, 5, 9, 10, 20].map(multiplier)).toEqual([1, 1, 2, 2, 3, 4]);
    expect(points(1, 3000)).toBe(10);
    expect(points(5, 1000)).toBe(25);
  });

  it('grades from misses and speed', () => {
    expect(gradeGlyph({ right: 3, wrong: 0, ms: [900, 1200, 1500], picked: [] })).toBe(Rating.Easy);
    expect(gradeGlyph({ right: 2, wrong: 0, ms: [4000, 5000], picked: [] })).toBe(Rating.Good);
    expect(gradeGlyph({ right: 1, wrong: 1, ms: [900], picked: [] })).toBe(Rating.Hard);
    expect(gradeGlyph({ right: 1, wrong: 2, ms: [900], picked: [] })).toBe(Rating.Again);
  });
});

describe('letter cards', () => {
  it('have their own prefix and count as practice', () => {
    expect(letterCardId('l-ka')).toBe('lt:l-ka');
    expect(isLetterCard('lt:l-ka')).toBe(true);
    expect(isPracticeCard('lt:l-ka')).toBe(true);
  });

  it('rise through the mastery levels as FSRS grows confident', () => {
    const f = scheduler(0.9);
    expect(masteryOf(undefined)).toBe(0);
    let row = review(f, 'lt:l-ka', undefined, Rating.Again, new Date(2026, 0, 1));
    expect(masteryOf(row)).toBe(1);
    row = review(f, 'lt:l-ka', undefined, Rating.Easy, new Date(2026, 0, 1));
    expect(masteryOf(row)).toBe(3);
    row = review(f, 'lt:l-ka', row, Rating.Easy, new Date(row.due));
    expect(masteryOf(row)).toBe(4);
  });

  it('builds the daily mix from due and learned letters, or the first letters', () => {
    const now = new Date(2026, 9, 26);
    expect(dailyMix(catalog, new Map(), new Set(), now)).toEqual(expect.arrayContaining(['l-ka', 'l-ma']));
    const due = review(scheduler(0.9), letterCardId('l-gha'), undefined, Rating.Good, new Date(2026, 8, 1));
    const mix = dailyMix(catalog, new Map([[due.itemId, due]]), new Set(['l-dha', 'l-ta']), now);
    expect(mix[0]).toBe('l-gha');
    expect(mix).toEqual(expect.arrayContaining(['l-dha', 'l-ta']));
  });
});
