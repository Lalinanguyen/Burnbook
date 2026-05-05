import 'fake-indexeddb/auto';
import { vi } from 'vitest';

const store = new Map<string, unknown>();

const chromeStub = {
  storage: {
    local: {
      get: vi.fn(async (key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        const result: Record<string, unknown> = {};
        for (const k of keys) {
          if (store.has(k)) result[k] = store.get(k);
        }
        return result;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) store.set(k, v);
      }),
      remove: vi.fn(async (key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        for (const k of keys) store.delete(k);
      }),
      clear: vi.fn(async () => store.clear()),
    },
  },
};

(globalThis as unknown as { chrome: typeof chromeStub }).chrome = chromeStub;

export function __resetChromeStorage() {
  store.clear();
}
