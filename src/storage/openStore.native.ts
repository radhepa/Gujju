import * as SQLite from 'expo-sqlite';
import { mergeStat, type Changes } from '../lib/progress';
import {
  DEFAULT_SETTINGS,
  LOCAL_USER,
  type Book,
  type CardRow,
  type DailyStatRow,
  type LessonProgressRow,
  type Settings,
} from '../lib/types';
import type { Store } from './store';

// Column names follow the plan's tables so they can map 1:1 onto Supabase
// when sync is added.
const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  best_accuracy REAL NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS card_state (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  due TEXT NOT NULL,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  elapsed_days REAL NOT NULL,
  scheduled_days REAL NOT NULL,
  learning_steps INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  state INTEGER NOT NULL,
  last_review TEXT,
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_stats (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  lessons_done INTEGER NOT NULL DEFAULT 0,
  reviews_done INTEGER NOT NULL DEFAULT 0,
  new_items INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS books (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
`;

type Row = Record<string, string | number | null>;

const toCard = (r: Row): CardRow => ({
  userId: r.user_id as string,
  itemId: r.item_id as string,
  due: r.due as string,
  stability: r.stability as number,
  difficulty: r.difficulty as number,
  elapsedDays: r.elapsed_days as number,
  scheduledDays: r.scheduled_days as number,
  learningSteps: r.learning_steps as number,
  reps: r.reps as number,
  lapses: r.lapses as number,
  state: r.state as number,
  lastReview: (r.last_review as string) ?? null,
});

const toStat = (r: Row): DailyStatRow => ({
  userId: r.user_id as string,
  date: r.date as string,
  xp: r.xp as number,
  lessonsDone: r.lessons_done as number,
  reviewsDone: r.reviews_done as number,
  newItems: r.new_items as number,
});

export async function openStore(): Promise<Store> {
  const db = await SQLite.openDatabaseAsync('gujju.db');
  await db.execAsync(SCHEMA);

  return {
    async load() {
      const lp = await db.getAllAsync<Row>('SELECT * FROM lesson_progress WHERE user_id = ?', LOCAL_USER);
      const cards = await db.getAllAsync<Row>('SELECT * FROM card_state WHERE user_id = ?', LOCAL_USER);
      const stats = await db.getAllAsync<Row>('SELECT * FROM daily_stats WHERE user_id = ?', LOCAL_USER);
      const s = await db.getFirstAsync<Row>("SELECT value FROM settings WHERE key = 'settings'");
      const books = await db.getAllAsync<Row>('SELECT data FROM books WHERE user_id = ?', LOCAL_USER);
      return {
        lessonProgress: lp.map(
          (r): LessonProgressRow => ({
            userId: r.user_id as string,
            lessonId: r.lesson_id as string,
            completedAt: r.completed_at as string,
            bestAccuracy: r.best_accuracy as number,
          }),
        ),
        cards: cards.map(toCard),
        dailyStats: stats.map(toStat),
        settings: s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s.value as string) } : DEFAULT_SETTINGS,
        books: books.map((r) => JSON.parse(r.data as string) as Book),
      };
    },

    async save(ch: Changes) {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const p of ch.lessonProgress) {
          await tx.runAsync(
            `INSERT INTO lesson_progress (user_id, lesson_id, completed_at, best_accuracy) VALUES (?, ?, ?, ?)
             ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed_at = excluded.completed_at,
             best_accuracy = MAX(best_accuracy, excluded.best_accuracy)`,
            p.userId,
            p.lessonId,
            p.completedAt,
            p.bestAccuracy,
          );
        }
        for (const c of ch.cards) {
          await tx.runAsync(
            `INSERT OR REPLACE INTO card_state (user_id, item_id, due, stability, difficulty, elapsed_days,
             scheduled_days, learning_steps, reps, lapses, state, last_review)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            c.userId,
            c.itemId,
            c.due,
            c.stability,
            c.difficulty,
            c.elapsedDays,
            c.scheduledDays,
            c.learningSteps,
            c.reps,
            c.lapses,
            c.state,
            c.lastReview,
          );
        }
        for (const l of ch.logs) {
          await tx.runAsync(
            'INSERT INTO review_log (user_id, item_id, rating, reviewed_at) VALUES (?, ?, ?, ?)',
            l.userId,
            l.itemId,
            l.rating,
            l.reviewedAt,
          );
        }
        const prev = await tx.getFirstAsync<Row>(
          'SELECT * FROM daily_stats WHERE user_id = ? AND date = ?',
          LOCAL_USER,
          ch.date,
        );
        const s = mergeStat(prev ? toStat(prev) : undefined, ch.date, ch.stats);
        await tx.runAsync(
          `INSERT OR REPLACE INTO daily_stats (user_id, date, xp, lessons_done, reviews_done, new_items)
           VALUES (?, ?, ?, ?, ?, ?)`,
          s.userId,
          s.date,
          s.xp,
          s.lessonsDone,
          s.reviewsDone,
          s.newItems,
        );
      });
    },

    async saveSettings(settings: Settings) {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)",
        JSON.stringify(settings),
      );
    },

    async saveBook(book: Book) {
      await db.runAsync(
        'INSERT OR REPLACE INTO books (user_id, id, data) VALUES (?, ?, ?)',
        LOCAL_USER,
        book.id,
        JSON.stringify(book),
      );
    },

    async deleteBook(id: string) {
      await db.runAsync('DELETE FROM books WHERE user_id = ? AND id = ?', LOCAL_USER, id);
    },

    async reset() {
      await db.execAsync(
        'DELETE FROM lesson_progress; DELETE FROM card_state; DELETE FROM review_log; DELETE FROM daily_stats;',
      );
    },
  };
}
