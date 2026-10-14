import { computeStreak } from '../lib/streak';
import type { DailyStatRow } from '../lib/types';

const day = (date: string, lessonsDone = 1, reviewsDone = 0): DailyStatRow => ({
  userId: 'local',
  date,
  xp: 10,
  lessonsDone,
  reviewsDone,
  newItems: 0,
});

describe('computeStreak', () => {
  it('is zero with no history', () => {
    expect(computeStreak([], '2026-10-14')).toEqual({ days: 0, doneToday: false });
  });

  it('counts consecutive days ending today', () => {
    const stats = [day('2026-10-12'), day('2026-10-13'), day('2026-10-14')];
    expect(computeStreak(stats, '2026-10-14')).toEqual({ days: 3, doneToday: true });
  });

  it('keeps yesterday’s streak alive before today’s lesson', () => {
    const stats = [day('2026-10-12'), day('2026-10-13')];
    expect(computeStreak(stats, '2026-10-14')).toEqual({ days: 2, doneToday: false });
  });

  it('breaks on a missed day', () => {
    const stats = [day('2026-10-10'), day('2026-10-11'), day('2026-10-13'), day('2026-10-14')];
    expect(computeStreak(stats, '2026-10-14').days).toBe(2);
  });

  it('counts a review session on its own', () => {
    expect(computeStreak([day('2026-10-14', 0, 1)], '2026-10-14').days).toBe(1);
  });

  it('ignores days with only XP rows and nothing finished', () => {
    expect(computeStreak([day('2026-10-14', 0, 0)], '2026-10-14').days).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    const stats = [day('2025-12-31'), day('2026-01-01')];
    expect(computeStreak(stats, '2026-01-01').days).toBe(2);
  });
});
