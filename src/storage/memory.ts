import type { BackupData } from '../lib/backup';
import { applyChanges, type Changes } from '../lib/progress';
import { DEFAULT_SETTINGS, type Book, type ReviewLogRow, type Settings, type Snapshot } from '../lib/types';
import { mergePatch, type Patch } from '../lib/sync';
import type { Store } from './store';

// Used in tests, and as a fallback if the real storage won't open
// (private browsing, for example). Progress lasts until the tab closes.
export function memoryStore(): Store & { logs: ReviewLogRow[] } {
  let snap: Snapshot = { lessonProgress: [], cards: [], dailyStats: [], settings: DEFAULT_SETTINGS, books: [] };
  const logs: ReviewLogRow[] = [];
  const meta = new Map<string, unknown>();
  return {
    logs,
    async load() {
      return snap;
    },
    async save(ch: Changes) {
      snap = applyChanges(snap, ch);
      logs.push(...ch.logs);
    },
    async saveSettings(settings: Settings) {
      snap = { ...snap, settings };
    },
    async saveBook(book: Book) {
      snap = { ...snap, books: [...snap.books.filter((b) => b.id !== book.id), book] };
    },
    async deleteBook(id: string) {
      snap = { ...snap, books: snap.books.filter((b) => b.id !== id) };
    },
    async reset() {
      // Books are the learner's own writing, so a progress reset keeps them.
      snap = { lessonProgress: [], cards: [], dailyStats: [], settings: snap.settings, books: snap.books };
      logs.length = 0;
    },
    async dump(): Promise<BackupData> {
      const { lessonProgress, cards, dailyStats, settings, books } = snap;
      return { lessonProgress, cards, reviewLog: [...logs], dailyStats, settings, books };
    },
    async restore(data: BackupData) {
      const { reviewLog, ...rest } = data;
      snap = rest;
      logs.length = 0;
      logs.push(...reviewLog);
    },
    async apply(patch: Patch) {
      snap = mergePatch(snap, patch);
    },
    async getMeta<T>(key: string) {
      return (meta.get(key) as T) ?? null;
    },
    async setMeta(key: string, value: unknown) {
      meta.set(key, value);
    },
  };
}
