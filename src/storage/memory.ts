import { applyChanges, type Changes } from '../lib/progress';
import { DEFAULT_SETTINGS, type ReviewLogRow, type Settings, type Snapshot } from '../lib/types';
import type { Store } from './store';

// Used in tests, and as a fallback if the real storage won't open
// (private browsing, for example). Progress lasts until the tab closes.
export function memoryStore(): Store & { logs: ReviewLogRow[] } {
  let snap: Snapshot = { lessonProgress: [], cards: [], dailyStats: [], settings: DEFAULT_SETTINGS };
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
    async reset() {
      snap = { lessonProgress: [], cards: [], dailyStats: [], settings: snap.settings };
      logs.length = 0;
    },
  };
}
