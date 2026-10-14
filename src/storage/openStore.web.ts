import { mergeStat, type Changes } from '../lib/progress';
import { DEFAULT_SETTINGS, type Settings, type Snapshot } from '../lib/types';
import { memoryStore } from './memory';
import type { Store } from './store';

// IndexedDB on the web. expo-sqlite's web build is still alpha and needs
// cross-origin isolation headers, which isn't worth it for a few hundred rows.

const DB_NAME = 'gujju';
const VERSION = 1;
const STORES = ['lesson_progress', 'card_state', 'review_log', 'daily_stats', 'settings'] as const;

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
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('lesson_progress', { keyPath: 'lessonId' });
      db.createObjectStore('card_state', { keyPath: 'itemId' });
      db.createObjectStore('review_log', { autoIncrement: true });
      db.createObjectStore('daily_stats', { keyPath: 'date' });
      db.createObjectStore('settings');
    };
    r.onsuccess = () => resolve(r.result);
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
      const tx = db.transaction(['lesson_progress', 'card_state', 'daily_stats', 'settings'], 'readonly');
      const [lessonProgress, cards, dailyStats, settings] = await Promise.all([
        req(tx.objectStore('lesson_progress').getAll()),
        req(tx.objectStore('card_state').getAll()),
        req(tx.objectStore('daily_stats').getAll()),
        req(tx.objectStore('settings').get('settings')),
      ]);
      return {
        lessonProgress,
        cards,
        dailyStats,
        settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
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

    async reset() {
      const tx = db.transaction([...STORES].filter((s) => s !== 'settings'), 'readwrite');
      for (const s of STORES) if (s !== 'settings') tx.objectStore(s).clear();
      await done(tx);
    },
  };
}
