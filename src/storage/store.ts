import type { Changes } from '../lib/progress';
import type { Settings, Snapshot } from '../lib/types';

// One interface over SQLite (iOS) and IndexedDB (web). Lesson and review
// code only ever sees this. The data is small (a few hundred cards), so the
// app loads everything once and writes each finished session in one
// transaction.

export interface Store {
  load(): Promise<Snapshot>;
  save(changes: Changes): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  reset(): Promise<void>;
}
