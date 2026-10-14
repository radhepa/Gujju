// Metro picks openStore.native.ts or openStore.web.ts at build time. This
// file is what TypeScript and Jest see.
import { memoryStore } from './memory';
import type { Store } from './store';

export async function openStore(): Promise<Store> {
  return memoryStore();
}
