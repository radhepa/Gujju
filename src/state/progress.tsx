import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { course } from '../content/course';
import { dayKey } from '../lib/dates';
import { applyChanges, applySession, type SessionKind } from '../lib/progress';
import type { Summary } from '../lib/session';
import { dueCards } from '../lib/srs';
import { computeStreak, type Streak } from '../lib/streak';
import { isPracticeCard } from '../lib/cloze';
import { DEFAULT_SETTINGS, type Book, type CardRow, type Settings, type Snapshot } from '../lib/types';
import { makeBackup, type Backup } from '../lib/backup';
import { mergePatch } from '../lib/sync';
import { lockStore, type LockedStore } from '../storage/locked';
import { openStore } from '../storage/openStore';
import { attachSync, noteChange, noteDeleted, noteSettingsChange } from '../sync/engine';

interface ProgressValue {
  ready: boolean;
  snapshot: Snapshot;
  completed: Set<string>;
  streak: Streak;
  xpToday: number;
  dueIds: string[];
  learnedIds: string[];
  // Every card by id, course and practice alike.
  cardRows: Map<string, CardRow>;
  finishSession(summary: Summary, kind: SessionKind, lessonIds: string[]): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  saveBook(book: Book): Promise<void>;
  deleteBook(id: string): Promise<void>;
  resetProgress(): Promise<void>;
  // Everything on this device, for a backup file.
  exportBackup(): Promise<Backup>;
  // Replaces everything on this device with a backup. When signed in, the
  // next sync merges it with the cloud copy.
  restoreBackup(backup: Backup): Promise<void>;
}

const Ctx = createContext<ProgressValue | null>(null);

const EMPTY: Snapshot = {
  lessonProgress: [],
  cards: [],
  dailyStats: [],
  settings: DEFAULT_SETTINGS,
  books: [],
};

// Local first: the UI updates from memory straight away and the write to
// SQLite / IndexedDB happens behind it. Nothing waits on the network; sync
// (src/sync) follows along when signed in.
export function ProgressProvider({ children }: { children: ReactNode }) {
  const store = useRef<LockedStore | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [ready, setReady] = useState(false);
  // Re-evaluate "today" when the app has been left open past midnight.
  const [today, setToday] = useState(() => dayKey(new Date()));

  useEffect(() => {
    let alive = true;
    openStore()
      .then(async (opened) => {
        const s = lockStore(opened);
        store.current = s;
        const snap = await s.load();
        if (alive) setSnapshot(snap);
        await attachSync(s, (patch) => alive && setSnapshot((cur) => mergePatch(cur, patch)));
      })
      .catch((e) => console.warn('Could not load progress', e))
      .finally(() => alive && setReady(true));
    const t = setInterval(() => setToday(dayKey(new Date())), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const finishSession = useCallback(
    async (summary: Summary, kind: SessionKind, lessonIds: string[]) => {
      const changes = applySession(snapshot, summary, { kind, lessonIds, now: new Date() });
      setSnapshot((s) => applyChanges(s, changes));
      await store.current?.save(changes);
      noteChange();
    },
    [snapshot],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const settings = { ...snapshot.settings, ...patch };
      setSnapshot((s) => ({ ...s, settings }));
      await store.current?.saveSettings(settings);
      // The backup date is this device's own business.
      if (Object.keys(patch).some((k) => k !== 'lastBackup')) await noteSettingsChange();
    },
    [snapshot.settings],
  );

  const resetProgress = useCallback(async () => {
    const gone = [
      ...snapshot.lessonProgress.map((p) => ({ tbl: 'lesson' as const, id: p.lessonId })),
      ...snapshot.cards.map((c) => ({ tbl: 'card' as const, id: c.itemId })),
      ...snapshot.dailyStats.map((d) => ({ tbl: 'day' as const, id: d.date })),
    ];
    setSnapshot((s) => ({ ...EMPTY, settings: s.settings, books: s.books }));
    await store.current?.reset();
    await noteDeleted(gone);
  }, [snapshot]);

  const saveBook = useCallback(async (book: Book) => {
    const stamped = { ...book, updatedAt: new Date().toISOString() };
    setSnapshot((s) => ({ ...s, books: [...s.books.filter((b) => b.id !== book.id), stamped] }));
    await store.current?.saveBook(stamped);
    noteChange();
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    setSnapshot((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
    await store.current?.deleteBook(id);
    await noteDeleted([{ tbl: 'book', id }]);
  }, []);

  const exportBackup = useCallback(async () => {
    if (!store.current) throw new Error('Your progress hasn’t loaded yet.');
    return makeBackup(await store.current.dump(), new Date());
  }, []);

  const restoreBackup = useCallback(async (backup: Backup) => {
    const s = store.current;
    if (!s) throw new Error('Your progress hasn’t loaded yet.');
    // Keep this device's own backup date rather than the file's.
    const settings = { ...backup.settings, lastBackup: snapshot.settings.lastBackup };
    await s.restore({ ...backup, settings });
    setSnapshot(await s.load());
    noteChange();
  }, [snapshot.settings.lastBackup]);

  const value = useMemo<ProgressValue>(() => {
    const now = new Date();
    const known = new Set(Object.keys(course.items));
    const cards = snapshot.cards.filter((c) => known.has(c.itemId));
    const cardRows = new Map(
      snapshot.cards.filter((c) => known.has(c.itemId) || isPracticeCard(c.itemId)).map((c) => [c.itemId, c]),
    );
    return {
      ready,
      snapshot,
      completed: new Set(snapshot.lessonProgress.map((p) => p.lessonId)),
      streak: computeStreak(snapshot.dailyStats, today),
      xpToday: snapshot.dailyStats.find((s) => s.date === today)?.xp ?? 0,
      dueIds: dueCards(cards, now).map((c) => c.itemId),
      learnedIds: cards.map((c) => c.itemId),
      cardRows,
      finishSession,
      updateSettings,
      resetProgress,
      saveBook,
      deleteBook,
      exportBackup,
      restoreBackup,
    };
  }, [snapshot, ready, today, finishSession, updateSettings, resetProgress, saveBook, deleteBook, exportBackup, restoreBackup]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress outside ProgressProvider');
  return v;
}
