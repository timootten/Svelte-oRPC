import { SvelteMap } from "svelte/reactivity";

const liveCache = new SvelteMap<symbol | string, unknown>();

export function liveCacheState<T>(
  prefix: string,
  key: string | undefined,
  initialValue: T
): {
  get current(): T;
  set current(newValue: T);
};

export function liveCacheState<T>(
  prefix: string,
  key?: string
): {
  get current(): T | undefined;
  set current(newValue: T | undefined);
};

export function liveCacheState<T>(
  prefix: string,
  key?: string,
  initialValue?: T
): {
  get current(): T | undefined;
  set current(newValue: T | undefined);
} {
  const stateKey = key ? `${prefix}_${key}` : Symbol();

  if (!liveCache.has(stateKey) && initialValue !== undefined) {
    liveCache.set(stateKey, initialValue);
  }

  const result = {
    get current() {
      return liveCache.get(stateKey) as T | undefined;
    },
    set current(newValue: T | undefined) {
      if (newValue === undefined) {
        liveCache.delete(stateKey);
      } else {
        liveCache.set(stateKey, newValue);
      }
    },
  };

  return result;
}