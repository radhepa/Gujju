import { applyChanges, type Changes } from '../lib/progress';
import { DEFAULT_SETTINGS, type Book, type ReviewLogRow, type Settings, type Snapshot } from '../lib/types';
import type { Store } from './store';

// Used in tests, and as a fallback if the real storage won't open
// (private browsing, for example). Progress lasts until the tab closes.
export function memoryStore(): Store & { logs: ReviewLogRow[] } {
  let snap: Snapshot = { lessonProgress: [], cards: [], dailyStats: [], settings: DEFAULT_SETTINGS, books: [] };
  const logs: ReviewLogRow[] = [];
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
  };
}
