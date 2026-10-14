import { addDays } from './dates';
import type { DailyStatRow } from './types';

// The streak is worked out from daily_stats every time, never stored, so it
// can't drift. A day counts if it has a finished lesson or review session.
// If today has nothing yet, the streak from yesterday is still alive.

export interface Streak {
  days: number;
  doneToday: boolean;
}

export function computeStreak(stats: DailyStatRow[], today: string): Streak {
  const active = new Set(stats.filter((s) => s.lessonsDone > 0 || s.reviewsDone > 0).map((s) => s.date));
  const doneToday = active.has(today);
  let day = doneToday ? today : addDays(today, -1);
  let days = 0;
  while (active.has(day)) {
    days++;
    day = addDays(day, -1);
  }
  return { days, doneToday };
}
