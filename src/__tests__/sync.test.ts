import { makeBackup, parseBackup } from '../lib/backup';
import { mergePatch, planSync, type LocalState, type RemoteRow } from '../lib/sync';
import { DEFAULT_SETTINGS, LOCAL_USER, type Book, type CardRow } from '../lib/types';
import { memoryStore } from '../storage/memory';

const card = (itemId: string, lastReview: string | null, reps = 1): CardRow => ({
  userId: LOCAL_USER,
  itemId,
  due: '2026-10-20T00:00:00.000Z',
  stability: 3,
  difficulty: 5,
  elapsedDays: 1,
  scheduledDays: 3,
  learningSteps: 0,
  reps,
  lapses: 0,
  state: 2,
  lastReview,
});

const empty = (): LocalState => ({
  lessonProgress: [],
  cards: [],
  dailyStats: [],
  books: [],
  settings: DEFAULT_SETTINGS,
  settingsAt: null,
  tombstones: {},
});

const remoteOf = (local: LocalState): RemoteRow[] => planSync(local, []).upserts;

describe('planSync', () => {
  it('sends everything up the first time', () => {
    const local = { ...empty(), cards: [card('a', '2026-10-01T00:00:00.000Z')] };
    const { patch, upserts } = planSync(local, []);
    expect(patch.cards).toEqual([]);
    expect(upserts.map((u) => `${u.tbl}/${u.id}`).sort()).toEqual(['card/a', 'settings/settings']);
    expect(upserts.find((u) => u.tbl === 'card')!.data).not.toHaveProperty('userId');
  });

  it('is quiet when both sides already agree', () => {
    const local = { ...empty(), cards: [card('a', '2026-10-01T00:00:00.000Z')] };
    const { patch, upserts } = planSync(local, remoteOf(local));
    expect(upserts).toEqual([]);
    expect(patch.cards).toEqual([]);
    expect(patch.settings).toBeNull();
  });

  it('keeps whichever copy of a card was reviewed last', () => {
    const older = { ...empty(), cards: [card('a', '2026-10-01T00:00:00.000Z', 1)] };
    const newer = { ...empty(), cards: [card('a', '2026-10-05T00:00:00.000Z', 2)] };

    const pulled = planSync(older, remoteOf(newer));
    expect(pulled.patch.cards[0].lastReview).toBe('2026-10-05T00:00:00.000Z');
    expect(pulled.upserts.filter((u) => u.tbl === 'card')).toEqual([]);

    const pushed = planSync(newer, remoteOf(older));
    expect(pushed.patch.cards).toEqual([]);
    expect(pushed.upserts.filter((u) => u.tbl === 'card')).toHaveLength(1);
  });

  it('merges lessons and days field by field', () => {
    const a = {
      ...empty(),
      lessonProgress: [{ userId: LOCAL_USER, lessonId: 'u1-l1', completedAt: '2026-10-02', bestAccuracy: 0.7 }],
      dailyStats: [{ userId: LOCAL_USER, date: '2026-10-02', xp: 40, lessonsDone: 2, reviewsDone: 0, newItems: 8 }],
    };
    const b = {
      ...empty(),
      lessonProgress: [{ userId: LOCAL_USER, lessonId: 'u1-l1', completedAt: '2026-10-01', bestAccuracy: 0.95 }],
      dailyStats: [{ userId: LOCAL_USER, date: '2026-10-02', xp: 25, lessonsDone: 1, reviewsDone: 12, newItems: 4 }],
    };
    const { patch, upserts } = planSync(a, remoteOf(b));
    expect(patch.lessonProgress[0]).toMatchObject({ completedAt: '2026-10-02', bestAccuracy: 0.95 });
    expect(patch.dailyStats[0]).toMatchObject({ xp: 40, lessonsDone: 2, reviewsDone: 12, newItems: 8 });
    // The merged copies go back up too, since neither side had them.
    expect(upserts.filter((u) => u.tbl !== 'settings')).toHaveLength(2);
  });

  it('ends with the same result whichever device syncs first', () => {
    const a = { ...empty(), cards: [card('x', '2026-10-03T00:00:00.000Z'), card('y', '2026-10-01T00:00:00.000Z')] };
    const b = { ...empty(), cards: [card('x', '2026-10-02T00:00:00.000Z'), card('y', '2026-10-04T00:00:00.000Z')] };
    const viaA = mergePatch(a, planSync(a, remoteOf(b)).patch).cards;
    const viaB = mergePatch(b, planSync(b, remoteOf(a)).patch).cards;
    const sort = (cs: CardRow[]) => [...cs].sort((p, q) => p.itemId.localeCompare(q.itemId));
    expect(sort(viaA)).toEqual(sort(viaB));
  });

  it('carries a deletion to the other device', () => {
    const book: Book = { id: 'b1', title: 'Recipe', builtIn: false, createdAt: '2026-10-01T00:00:00.000Z', sentences: [] };
    const here = { ...empty(), books: [book] };
    const remote: RemoteRow[] = [{ tbl: 'book', id: 'b1', data: { at: '2026-10-05T00:00:00.000Z' }, deleted: true }];
    const { patch, upserts } = planSync(here, remote);
    expect(patch.drop.book).toEqual(['b1']);
    expect(upserts.filter((u) => u.tbl === 'book')).toEqual([]);
  });

  it('sends a local deletion up as a marker', () => {
    const there: RemoteRow[] = [{ tbl: 'card', id: 'a', data: { ...card('a', '2026-10-01T00:00:00.000Z') }, deleted: false }];
    const here = { ...empty(), tombstones: { 'card/a': '2026-10-06T00:00:00.000Z' } };
    const { upserts } = planSync(here, there);
    expect(upserts).toContainEqual({ tbl: 'card', id: 'a', data: { at: '2026-10-06T00:00:00.000Z' }, deleted: true });
  });

  it('lets a card reviewed after a reset survive it', () => {
    const here = { ...empty(), cards: [card('a', '2026-10-07T00:00:00.000Z')] };
    const remote: RemoteRow[] = [{ tbl: 'card', id: 'a', data: { at: '2026-10-06T00:00:00.000Z' }, deleted: true }];
    const { patch, upserts } = planSync(here, remote);
    expect(patch.drop.card).toEqual([]);
    expect(upserts).toContainEqual(expect.objectContaining({ tbl: 'card', id: 'a', deleted: false }));
  });

  it('takes the newer settings but keeps this device’s backup date', () => {
    const here = { ...empty(), settings: { ...DEFAULT_SETTINGS, dailyGoal: 30, lastBackup: '2026-10-10T00:00:00.000Z' }, settingsAt: '2026-10-01T00:00:00.000Z' };
    const there = { ...empty(), settings: { ...DEFAULT_SETTINGS, dailyGoal: 80 }, settingsAt: '2026-10-09T00:00:00.000Z' };
    const { patch } = planSync(here, remoteOf(there));
    expect(patch.settings).toMatchObject({ dailyGoal: 80, lastBackup: '2026-10-10T00:00:00.000Z' });
  });
});

describe('mergePatch', () => {
  it('never undoes a review made while a sync was running', () => {
    const now = { ...empty(), cards: [card('a', '2026-10-08T00:00:00.000Z', 3)] };
    const stale = planSync({ ...empty(), cards: [card('a', '2026-10-01T00:00:00.000Z')] }, remoteOf({ ...empty(), cards: [card('a', '2026-10-05T00:00:00.000Z', 2)] })).patch;
    expect(mergePatch(now, stale).cards[0].reps).toBe(3);
  });
});

describe('backups', () => {
  it('round-trips through a file', async () => {
    const store = memoryStore();
    await store.save({
      date: '2026-10-14',
      lessonProgress: [{ userId: LOCAL_USER, lessonId: 'u1-l1', completedAt: '2026-10-14T10:00:00.000Z', bestAccuracy: 0.9 }],
      cards: [card('a', '2026-10-14T10:00:00.000Z')],
      logs: [{ userId: LOCAL_USER, itemId: 'a', rating: 3, reviewedAt: '2026-10-14T10:00:00.000Z' }],
      stats: { xp: 15, lessonsDone: 1, reviewsDone: 0, newItems: 4 },
    });
    const file = JSON.stringify(makeBackup(await store.dump(), new Date('2026-10-14T12:00:00.000Z')));

    const other = memoryStore();
    await other.restore(parseBackup(file));
    const back = await other.dump();
    expect(back.cards).toHaveLength(1);
    expect(back.reviewLog).toHaveLength(1);
    expect(back.lessonProgress[0].bestAccuracy).toBe(0.9);
  });

  it('refuses files that aren’t backups', () => {
    expect(() => parseBackup('not json')).toThrow('isn’t a Gujju backup');
    expect(() => parseBackup('{"app":"pastime"}')).toThrow('isn’t a Gujju backup');
    expect(() => parseBackup(JSON.stringify({ app: 'gujju', version: 99 }))).toThrow('newer version');
  });

  it('refuses a damaged card before anything is overwritten', () => {
    const bad = { app: 'gujju', version: 1, lessonProgress: [], cards: [{ itemId: 'a' }], dailyStats: [], books: [], settings: {} };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow('damaged review card');
  });
});
