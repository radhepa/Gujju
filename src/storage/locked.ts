import type { Store } from './store';

// One write at a time. A sync reads, merges and writes back as one step
// (exclusive), and a lesson finished meanwhile waits its turn instead of
// landing in the middle.
export interface LockedStore extends Store {
  exclusive<T>(fn: (inner: Store) => Promise<T>): Promise<T>;
}

export function lockStore(inner: Store): LockedStore {
  let tail: Promise<unknown> = Promise.resolve();
  const run = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn, fn);
    tail = next.catch(() => {});
    return next;
  };
  const wrapped = {} as LockedStore;
  for (const name of Object.keys(inner) as (keyof Store)[]) {
    const method = inner[name] as (...args: unknown[]) => Promise<unknown>;
    (wrapped as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => run(() => method(...args));
  }
  wrapped.exclusive = (fn) => run(() => fn(inner));
  return wrapped;
}
