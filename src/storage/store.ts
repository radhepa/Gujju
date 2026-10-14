import type { BackupData } from '../lib/backup';
import type { Changes } from '../lib/progress';
import type { Patch } from '../lib/sync';
import type { Book, Settings, Snapshot } from '../lib/types';

// One interface over SQLite (iOS) and IndexedDB (web). Lesson and review
// code only ever sees this. The data is small (a few hundred cards), so the
// app loads everything once and writes each finished session in one
// transaction.

export interface Store {
  load(): Promise<Snapshot>;
  save(changes: Changes): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  saveBook(book: Book): Promise<void>;
  deleteBook(id: string): Promise<void>;
  reset(): Promise<void>;
  // Everything, review history included, for a backup file.
  dump(): Promise<BackupData>;
  // Replaces everything with a backup, in one transaction.
  restore(data: BackupData): Promise<void>;
  // Writes what a sync decided, in one transaction.
  apply(patch: Patch): Promise<void>;
  // Small values the app keeps for itself (sync state). Kept through a
  // progress reset and a restore.
  getMeta<T>(key: string): Promise<T | null>;
  setMeta(key: string, value: unknown): Promise<void>;
}
