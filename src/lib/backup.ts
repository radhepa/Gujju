import {
  DEFAULT_SETTINGS,
  LOCAL_USER,
  type Book,
  type CardRow,
  type DailyStatRow,
  type LessonProgressRow,
  type ReviewLogRow,
  type Settings,
} from './types';

// Everything the app knows about the learner, in one file they keep. Progress
// only ever lives on the device, so this file is the way to move to a new
// phone or recover after the browser clears its storage.

export const BACKUP_APP = 'gujju';
export const BACKUP_VERSION = 1;

export interface BackupData {
  lessonProgress: LessonProgressRow[];
  cards: CardRow[];
  reviewLog: ReviewLogRow[];
  dailyStats: DailyStatRow[];
  settings: Settings;
  books: Book[];
}

export interface Backup extends BackupData {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
}

export function makeBackup(data: BackupData, now: Date): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data };
}

export function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `gujju-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function rows<T>(v: unknown, name: string, ok: (r: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(v)) throw new Error(`The backup has no ${name}.`);
  for (const r of v) if (!isObj(r) || !ok(r)) throw new Error(`The backup has a damaged ${name} entry.`);
  // Rows always belong to this device's learner, whatever the file says.
  return v.map((r) => ({ ...r, userId: LOCAL_USER }) as T);
}

// Checks a file the learner picked before anything is overwritten. Throws
// with a message that can be shown as it is.
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a Gujju backup.');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new Error('That file isn’t a Gujju backup.');
  if (!num(raw.version) || (raw.version as number) > BACKUP_VERSION) {
    throw new Error('This backup is from a newer version of Gujju. Update the app and try again.');
  }

  const lessonProgress = rows<LessonProgressRow>(
    raw.lessonProgress,
    'lesson',
    (r) => str(r.lessonId) && str(r.completedAt) && num(r.bestAccuracy),
  );
  const cards = rows<CardRow>(
    raw.cards,
    'review card',
    (r) =>
      str(r.itemId) &&
      str(r.due) &&
      ['stability', 'difficulty', 'elapsedDays', 'scheduledDays', 'learningSteps', 'reps', 'lapses', 'state'].every(
        (k) => num(r[k]),
      ) &&
      (r.lastReview === null || str(r.lastReview)),
  );
  const reviewLog = rows<ReviewLogRow>(
    raw.reviewLog ?? [],
    'review history',
    (r) => str(r.itemId) && num(r.rating) && str(r.reviewedAt),
  );
  const dailyStats = rows<DailyStatRow>(
    raw.dailyStats,
    'day',
    (r) => str(r.date) && ['xp', 'lessonsDone', 'reviewsDone', 'newItems'].every((k) => num(r[k])),
  );
  if (!Array.isArray(raw.books) || !raw.books.every((b) => isObj(b) && str(b.id))) {
    throw new Error('The backup has a damaged book.');
  }
  const settings = isObj(raw.settings) ? { ...DEFAULT_SETTINGS, ...raw.settings } : DEFAULT_SETTINGS;

  return {
    app: BACKUP_APP,
    version: raw.version as number,
    exportedAt: str(raw.exportedAt) ? (raw.exportedAt as string) : '',
    lessonProgress,
    cards,
    reviewLog,
    dailyStats,
    settings: settings as Settings,
    books: raw.books as unknown as Book[],
  };
}
