import {
  LOCAL_USER,
  type Book,
  type CardRow,
  type DailyStatRow,
  type LessonProgressRow,
  type Settings,
} from './types';

// Deciding what wins when this device and the cloud copy disagree. No
// network or storage here, so it can be tested on its own (see sync.ts in
// src/sync for the part that talks to Supabase).
//
// Every record merges the same way on every device, whichever order things
// arrive in, so two phones always end up agreeing:
// - a lesson keeps its best accuracy and latest finish
// - a review card keeps whichever copy was reviewed last
// - a day keeps the higher of each count
// - a book and the settings keep the most recently saved copy
// - a deletion (a deleted book, a progress reset) wins over anything older

export type Tbl = 'lesson' | 'card' | 'day' | 'book' | 'settings';

export interface RemoteRow {
  tbl: Tbl;
  id: string;
  data: unknown;
  deleted: boolean;
}

export interface Upsert {
  tbl: Tbl;
  id: string;
  data: unknown;
  deleted: boolean;
}

export type SyncedSettings = Omit<Settings, 'lastBackup'>;
interface SettingsRecord {
  settings: SyncedSettings;
  at: string;
}

export interface LocalState {
  lessonProgress: LessonProgressRow[];
  cards: CardRow[];
  dailyStats: DailyStatRow[];
  books: Book[];
  settings: Settings;
  // When the settings were last changed here; null if never.
  settingsAt: string | null;
  // "tbl/id" → when it was deleted here, for deletions not yet in the cloud.
  tombstones: Record<string, string>;
}

export interface Patch {
  lessonProgress: LessonProgressRow[];
  cards: CardRow[];
  dailyStats: DailyStatRow[];
  books: Book[];
  settings: Settings | null;
  drop: { lesson: string[]; card: string[]; day: string[]; book: string[] };
}

export const SETTINGS_ID = 'settings';
const EPOCH = '1970-01-01T00:00:00.000Z';

export const keyOf = (tbl: Tbl, id: string) => `${tbl}/${id}`;

export function emptyPatch(): Patch {
  return {
    lessonProgress: [],
    cards: [],
    dailyStats: [],
    books: [],
    settings: null,
    drop: { lesson: [], card: [], day: [], book: [] },
  };
}

export const isEmptyPatch = (p: Patch) =>
  !p.lessonProgress.length &&
  !p.cards.length &&
  !p.dailyStats.length &&
  !p.books.length &&
  !p.settings &&
  !Object.values(p.drop).some((d) => d.length);

// JSON with sorted keys, so a record that went through Postgres compares
// equal to the local copy.
export const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x,
  ) ?? '';

const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const maxStr = (a: string, b: string) => (a > b ? a : b);

// Picks one of two copies by a sort key, falling back to the JSON itself so
// a tie still picks the same copy on every device.
function newest<T>(a: T, b: T, key: (x: T) => string | number): T {
  const ka = key(a);
  const kb = key(b);
  if (ka !== kb) return ka > kb ? a : b;
  return stable(a) >= stable(b) ? a : b;
}

type Lesson = Omit<LessonProgressRow, 'userId'>;
type Card = Omit<CardRow, 'userId'>;
type Day = Omit<DailyStatRow, 'userId'>;

function strip<T extends { userId: string }>(r: T): Omit<T, 'userId'> {
  const { userId: _, ...rest } = r;
  return rest;
}

export const joinLesson = (a: Lesson, b: Lesson): Lesson => ({
  lessonId: a.lessonId,
  completedAt: maxStr(a.completedAt, b.completedAt),
  bestAccuracy: Math.max(a.bestAccuracy, b.bestAccuracy),
});

export const joinCard = (a: Card, b: Card): Card =>
  newest(a, b, (c) => `${c.lastReview ?? ''}|${String(c.reps).padStart(6, '0')}`);

export const joinDay = (a: Day, b: Day): Day => ({
  date: a.date,
  xp: Math.max(a.xp, b.xp),
  lessonsDone: Math.max(a.lessonsDone, b.lessonsDone),
  reviewsDone: Math.max(a.reviewsDone, b.reviewsDone),
  newItems: Math.max(a.newItems, b.newItems),
});

const bookStamp = (b: Book) => b.updatedAt ?? b.createdAt ?? '';
export const joinBook = (a: Book, b: Book): Book => newest(a, b, bookStamp);

const joinSettings = (a: SettingsRecord, b: SettingsRecord) => newest(a, b, (s) => s.at);

// Whether a deletion at `at` removes this copy. A day counts as deleted if
// the deletion happened on or after that day.
function deletes(tbl: Tbl, value: unknown, at: string): boolean {
  switch (tbl) {
    case 'lesson':
      return (value as Lesson).completedAt <= at;
    case 'card':
      return ((value as Card).lastReview ?? '') <= at;
    case 'day':
      return (value as Day).date <= at.slice(0, 10);
    case 'book':
      return bookStamp(value as Book) <= at;
    default:
      return false;
  }
}

function join(tbl: Tbl, a: unknown, b: unknown): unknown {
  switch (tbl) {
    case 'lesson':
      return joinLesson(a as Lesson, b as Lesson);
    case 'card':
      return joinCard(a as Card, b as Card);
    case 'day':
      return joinDay(a as Day, b as Day);
    case 'book':
      return joinBook(a as Book, b as Book);
    case 'settings':
      return joinSettings(a as SettingsRecord, b as SettingsRecord);
  }
}

const deletedAt = (data: unknown) =>
  data && typeof data === 'object' && typeof (data as { at?: unknown }).at === 'string'
    ? (data as { at: string }).at
    : EPOCH;

function syncedSettings(s: Settings): SyncedSettings {
  const { lastBackup: _, ...rest } = s;
  return rest;
}

// Merges this device with the whole cloud copy. Returns what to change here
// and what to send up.
export function planSync(local: LocalState, remote: RemoteRow[]): { patch: Patch; upserts: Upsert[] } {
  const mine = new Map<string, { tbl: Tbl; id: string; value: unknown }>();
  const put = (tbl: Tbl, id: string, value: unknown) => mine.set(keyOf(tbl, id), { tbl, id, value });
  for (const r of local.lessonProgress) put('lesson', r.lessonId, strip(r));
  for (const r of local.cards) put('card', r.itemId, strip(r));
  for (const r of local.dailyStats) put('day', r.date, strip(r));
  for (const b of local.books) put('book', b.id, b);
  put('settings', SETTINGS_ID, {
    settings: syncedSettings(local.settings),
    at: local.settingsAt ?? EPOCH,
  } satisfies SettingsRecord);

  const theirs = new Map(remote.map((r) => [keyOf(r.tbl, r.id), r]));
  const keys = new Set([...mine.keys(), ...theirs.keys(), ...Object.keys(local.tombstones)]);

  const patch = emptyPatch();
  const upserts: Upsert[] = [];

  for (const key of keys) {
    const slash = key.indexOf('/');
    const tbl = key.slice(0, slash) as Tbl;
    const id = key.slice(slash + 1);
    const l = mine.get(key)?.value;
    const r = theirs.get(key);
    const rv = r && !r.deleted ? r.data : undefined;

    let merged = l !== undefined && rv !== undefined ? join(tbl, l, rv) : (l ?? rv);
    const localDel = local.tombstones[key];
    const remoteDel = r?.deleted ? deletedAt(r.data) : undefined;
    const delAt = localDel && remoteDel ? maxStr(localDel, remoteDel) : (localDel ?? remoteDel);

    if (delAt && tbl !== 'settings' && (merged === undefined || deletes(tbl, merged, delAt))) merged = undefined;

    if (merged === undefined) {
      if (l !== undefined) patch.drop[tbl as keyof Patch['drop']].push(id);
      if (delAt && !(r?.deleted && deletedAt(r.data) === delAt)) upserts.push({ tbl, id, data: { at: delAt }, deleted: true });
      continue;
    }

    if (l === undefined || !same(merged, l)) {
      switch (tbl) {
        case 'lesson':
          patch.lessonProgress.push({ userId: LOCAL_USER, ...(merged as Lesson) });
          break;
        case 'card':
          patch.cards.push({ userId: LOCAL_USER, ...(merged as Card) });
          break;
        case 'day':
          patch.dailyStats.push({ userId: LOCAL_USER, ...(merged as Day) });
          break;
        case 'book':
          patch.books.push(merged as Book);
          break;
        case 'settings':
          patch.settings = { ...(merged as SettingsRecord).settings, lastBackup: local.settings.lastBackup };
          break;
      }
    }
    if (rv === undefined || !same(merged, rv)) upserts.push({ tbl, id, data: merged, deleted: false });
  }

  return { patch, upserts };
}

// Folds a patch into what's in memory using the same rules, so a lesson
// finished while a sync was running is never undone by it.
export function mergePatch<
  S extends Pick<LocalState, 'lessonProgress' | 'cards' | 'dailyStats' | 'books' | 'settings'>,
>(s: S, patch: Patch): S {
  const merge = <T, K>(rows: T[], incoming: T[], key: (r: T) => K, joinFn: (a: T, b: T) => T, drop: string[]) => {
    const m = new Map(rows.map((r) => [key(r), r]));
    for (const d of drop) m.delete(d as K);
    for (const r of incoming) {
      const k = key(r);
      const cur = m.get(k);
      m.set(k, cur ? joinFn(cur, r) : r);
    }
    return [...m.values()];
  };
  const withUser = <T extends { userId: string }>(f: (a: Omit<T, 'userId'>, b: Omit<T, 'userId'>) => Omit<T, 'userId'>) =>
    (a: T, b: T) => ({ userId: LOCAL_USER, ...f(strip(a), strip(b)) }) as T;

  return {
    ...s,
    lessonProgress: merge(s.lessonProgress, patch.lessonProgress, (r) => r.lessonId, withUser(joinLesson), patch.drop.lesson),
    cards: merge(s.cards, patch.cards, (r) => r.itemId, withUser(joinCard), patch.drop.card),
    dailyStats: merge(s.dailyStats, patch.dailyStats, (r) => r.date, withUser(joinDay), patch.drop.day),
    books: merge(s.books, patch.books, (b) => b.id, joinBook, patch.drop.book),
    settings: patch.settings ? { ...patch.settings, lastBackup: s.settings.lastBackup } : s.settings,
  };
}
