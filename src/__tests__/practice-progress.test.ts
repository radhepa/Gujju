import { Rating, type Grade } from 'ts-fsrs';
import { applyChanges, applySession, NEW_PER_DAY } from '../lib/progress';
import { bestStreak, computeStreak } from '../lib/streak';
import { DEFAULT_SETTINGS, type Snapshot } from '../lib/types';
import { memoryStore } from '../storage/memory';

const empty: Snapshot = { lessonProgress: [], cards: [], dailyStats: [], settings: DEFAULT_SETTINGS, books: [] };
const now = new Date(2026, 9, 14, 9, 0);

describe('practice rounds', () => {
  const grades: Record<string, Grade> = Object.fromEntries(Array.from({ length: NEW_PER_DAY + 5 }, (_, i) => [`cz:s-${i}`, Rating.Good]));
  const summary = { xp: 70, correctFirstTry: 7, total: 10, accuracy: 0.7, grades };

  it("schedule every sentence and don't use the course's new-item budget", () => {
    const ch = applySession(empty, summary, { kind: 'practice', lessonIds: [], now });
    expect(ch.cards).toHaveLength(NEW_PER_DAY + 5);
    expect(ch.cards.every((c) => c.reps === 1)).toBe(true);
    expect(ch.stats).toEqual({ xp: 70, lessonsDone: 0, reviewsDone: 1, newItems: 0 });
  });

  it('keep the streak alive', () => {
    const snap = applyChanges(empty, applySession(empty, summary, { kind: 'practice', lessonIds: [], now }));
    expect(computeStreak(snap.dailyStats, '2026-10-14')).toEqual({ days: 1, doneToday: true });
  });
});

describe('best streak', () => {
  const day = (date: string, active = true) => ({ userId: 'local', date, xp: 10, lessonsDone: active ? 1 : 0, reviewsDone: 0, newItems: 0 });

  it('finds the longest run of active days', () => {
    expect(bestStreak([day('2026-10-01'), day('2026-10-02'), day('2026-10-03'), day('2026-10-05'), day('2026-10-06')])).toBe(3);
    expect(bestStreak([day('2026-10-01'), day('2026-10-02', false), day('2026-10-03')])).toBe(1);
    expect(bestStreak([])).toBe(0);
  });
});

describe('books in storage', () => {
  it('saves, replaces and deletes books, and a reset keeps them', async () => {
    const store = memoryStore();
    const book = { id: 'b1', title: 'One', builtIn: false, sentences: [{ id: 'p1', gu: 'હું ઘરે છું.' }] };
    await store.saveBook(book);
    await store.saveBook({ ...book, title: 'Uno' });
    expect((await store.load()).books.map((b) => b.title)).toEqual(['Uno']);
    await store.reset();
    expect((await store.load()).books).toHaveLength(1);
    await store.deleteBook('b1');
    expect((await store.load()).books).toEqual([]);
  });
});
