import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { isEmptyPatch, keyOf, planSync, type Patch, type RemoteRow, type Tbl } from '../lib/sync';
import type { LockedStore } from '../storage/locked';
import { supabase } from './client';

// Keeps this device and the cloud copy in step. The app only ever reads and
// writes the local database, so it works the same with no signal; this runs
// behind it:
// - a few seconds after anything changes, and whenever the app comes back
//   to the front, it fetches the cloud copy, merges (lib/sync.ts) and sends
//   up whatever the cloud is missing
// - signing in is optional; signed out, nothing leaves the device

const LINK = 'sync.link';
const TOMBSTONES = 'sync.tombstones';
const SETTINGS_AT = 'sync.settingsAt';
const PAGE = 1000;
const BATCH = 500;

interface Link {
  id: string;
  email?: string;
}

export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'signed-out' | 'error';
export interface SyncStatus {
  state: SyncState;
  email?: string;
  lastSyncAt?: number;
  error?: string;
}

let store: LockedStore | null = null;
let onPatch: (p: Patch) => void = () => {};
let link: Link | null = null;
let status: SyncStatus = { state: 'off' };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch, email: link?.email };
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
  );
}

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleSync(ms: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

async function pullAll(userId: string): Promise<RemoteRow[]> {
  const rows: RemoteRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('gujju_rows')
      .select('tbl,id,data,deleted')
      .eq('user_id', userId)
      .order('tbl')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as RemoteRow[]));
    if (!data || data.length < PAGE) return rows;
  }
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (!link || !store) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        setStatus({ state: 'syncing', error: undefined });
        const { data } = await supabase.auth.getSession();
        if (!data.session || data.session.user.id !== link?.id) {
          setStatus({ state: 'signed-out' });
          return;
        }
        const userId = link.id;
        const remote = await pullAll(userId);

        // Read, merge and write back in one go, so nothing finished in the
        // meantime is overwritten.
        const { upserts, tombstones } = await store!.exclusive(async (s) => {
          const [d, settingsAt, tombstones] = await Promise.all([
            s.dump(),
            s.getMeta<string>(SETTINGS_AT),
            s.getMeta<Record<string, string>>(TOMBSTONES),
          ]);
          const plan = planSync({ ...d, settingsAt, tombstones: tombstones ?? {} }, remote);
          if (!isEmptyPatch(plan.patch)) {
            await s.apply(plan.patch);
            onPatch(plan.patch);
          }
          return { upserts: plan.upserts, tombstones: tombstones ?? {} };
        });

        for (let i = 0; i < upserts.length; i += BATCH) {
          const rows = upserts.slice(i, i + BATCH).map((u) => ({ user_id: userId, ...u }));
          const { error } = await supabase.from('gujju_rows').upsert(rows, { onConflict: 'user_id,tbl,id' });
          if (error) throw error;
        }

        // Deletions are in the cloud now. Keep any made while this ran.
        if (Object.keys(tombstones).length) {
          await store!.exclusive(async (s) => {
            const now = (await s.getMeta<Record<string, string>>(TOMBSTONES)) ?? {};
            for (const [k, at] of Object.entries(tombstones)) if (now[k] === at) delete now[k];
            await s.setMeta(TOMBSTONES, now);
          });
        }
      } while (again && link);
      setStatus({ state: 'synced', lastSyncAt: Date.now() });
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      const offline = e instanceof TypeError || /fetch|network|load failed/i.test(msg);
      setStatus({ state: offline ? 'offline' : 'error', error: offline ? undefined : msg });
      scheduleSync(offline ? 30_000 : 60_000);
    } finally {
      running = null;
    }
  })();
  return running;
}

// Called by the progress provider once the local database is open.
export async function attachSync(s: LockedStore, apply: (p: Patch) => void) {
  store = s;
  onPatch = apply;
  link = await s.getMeta<Link>(LINK);
  setStatus({ state: link ? 'syncing' : 'off' });
  if (link) void syncNow();
}

AppState.addEventListener('change', (state) => {
  if (state === 'active' && link) void syncNow();
});

// The session ended somewhere else (password changed, or it expired): keep
// everything here and ask to sign in again.
supabase.auth.onAuthStateChange((event) => {
  if (link && event === 'SIGNED_OUT') setStatus({ state: 'signed-out' });
});

// Something changed here; send it up shortly.
export function noteChange() {
  if (link) scheduleSync(4000);
}

export async function noteSettingsChange() {
  await store?.setMeta(SETTINGS_AT, new Date().toISOString());
  noteChange();
}

// Records deletions so they reach the cloud too. Only while signed in: a
// deletion made before signing in shouldn't erase what's already there.
export async function noteDeleted(items: { tbl: Tbl; id: string }[]) {
  if (!link || !store || !items.length) return;
  const at = new Date().toISOString();
  await store.exclusive(async (s) => {
    const t = (await s.getMeta<Record<string, string>>(TOMBSTONES)) ?? {};
    for (const { tbl, id } of items) t[keyOf(tbl, id)] = at;
    await s.setMeta(TOMBSTONES, t);
  });
  noteChange();
}

// Signs in with an existing account, the same one as FitPip and Pastime.
// There's no sign-up here on purpose: accounts are made once, in FitPip.
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  if (link?.id !== data.user.id) await store?.setMeta(TOMBSTONES, {});
  link = { id: data.user.id, email: data.user.email };
  await store?.setMeta(LINK, link);
  setStatus({});
  await syncNow();
}

// Stops syncing on this device only. scope 'local' matters: the default
// would also sign out FitPip, Pastime and every other device. Everything
// already here stays here.
export async function signOut() {
  clearTimeout(timer);
  try {
    await syncNow();
  } catch {
    // Offline: unsent changes just stay on this device.
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  link = null;
  await store?.setMeta(LINK, null);
  await store?.setMeta(TOMBSTONES, {});
  setStatus({ state: 'off', lastSyncAt: undefined, error: undefined });
}
