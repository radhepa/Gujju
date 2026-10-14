import { mergeStat, type Changes } from '../lib/progress';
import { DEFAULT_SETTINGS, type Book, type Settings, type Snapshot } from '../lib/types';
import { memoryStore } from './memory';
import type { Store } from './store';

// IndexedDB on the web. expo-sqlite's web build is still alpha and needs
// cross-origin isolation headers, which isn't worth it for a few hundred rows.

const DB_NAME = 'gujju';
const VERSION = 2;
// Cleared by a progress reset. Settings and books are kept.
const PROGRESS = ['lesson_progress', 'card_state', 'review_log', 'daily_stats'] as const;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = (e) => {
      const db = r.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('lesson_progress', { keyPath: 'lessonId' });
        db.createObjectStore('card_state', { keyPath: 'itemId' });
        db.createObjectStore('review_log', { autoIncrement: true });
        db.createObjectStore('daily_stats', { keyPath: 'date' });
        db.createObjectStore('settings');
      }
      if (e.oldVersion < 2) db.createObjectStore('books', { keyPath: 'id' });
    };
    r.onsuccess = () => {
      // If a newer version of the app opens the database in another tab,
      // let it upgrade instead of leaving it waiting on this one.
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function openStore(): Promise<Store> {
  let db: IDBDatabase;
  try {
    db = await open();
  } catch (e) {
    console.warn('IndexedDB unavailable, progress will not be saved', e);
    return memoryStore();
  }

  return {
    async load(): Promise<Snapshot> {
      const tx = db.transaction(['lesson_progress', 'card_state', 'daily_stats', 'settings', 'books'], 'readonly');
      const [lessonProgress, cards, dailyStats, settings, books] = await Promise.all([
        req(tx.objectStore('lesson_progress').getAll()),
        req(tx.objectStore('card_state').getAll()),
        req(tx.objectStore('daily_stats').getAll()),
        req(tx.objectStore('settings').get('settings')),
        req(tx.objectStore('books').getAll()),
      ]);
      return {
        lessonProgress,
        cards,
        dailyStats,
        settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
        books,
      };
    },

    async save(ch: Changes) {
      const tx = db.transaction(['lesson_progress', 'card_state', 'review_log', 'daily_stats'], 'readwrite');
      const lp = tx.objectStore('lesson_progress');
      for (const p of ch.lessonProgress) {
        const prev = await req(lp.get(p.lessonId));
        lp.put({ ...p, bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, p.bestAccuracy) });
      }
      const cards = tx.objectStore('card_state');
      for (const c of ch.cards) cards.put(c);
      const logs = tx.objectStore('review_log');
      for (const l of ch.logs) logs.add(l);
      const stats = tx.objectStore('daily_stats');
      const prev = await req(stats.get(ch.date));
      stats.put(mergeStat(prev, ch.date, ch.stats));
      await done(tx);
    },

    async saveSettings(settings: Settings) {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put(settings, 'settings');
      await done(tx);
    },

    async saveBook(book: Book) {
      const tx = db.transaction('books', 'readwrite');
      tx.objectStore('books').put(book);
      await done(tx);
    },

    async deleteBook(id: string) {
      const tx = db.transaction('books', 'readwrite');
      tx.objectStore('books').delete(id);
      await done(tx);
    },

    async reset() {
      const tx = db.transaction([...PROGRESS], 'readwrite');
      for (const s of PROGRESS) tx.objectStore(s).clear();
      await done(tx);
    },
  };
}
