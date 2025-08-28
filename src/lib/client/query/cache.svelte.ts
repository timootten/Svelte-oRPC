import { browser } from "$app/environment";
import { getQueryGlobalState } from "./globalState.svelte";

export enum CacheType {
  QUERY = "QUERY",
  MUTATION = "MUTATION",
}

export type StateKey = string | symbol;

export type CacheOptions<T> = {
  initialValue?: T;
  staleTimeMs?: number;
  cacheTimeMs?: number;
};

export type CacheResult<T, CO extends CacheOptions<T> | undefined = undefined> = {
  get value(): CO extends { initialValue: T } ? T : T | undefined;
  set value(v: CO extends { initialValue: T } ? T : T | undefined);
  get lastUpdated(): number | undefined;
  invalidate(): void;
};

export function CacheState<
  T,
  CO extends CacheOptions<T> | undefined = undefined
>(
  type: CacheType,
  key?: string,
  options?: CO
): CacheResult<T, CO> {
  const { initialValue, cacheTimeMs = 5 * 60 * 1000 } = options ?? {};

  if (!browser) {
    // Create reactive state even on server
    let ssrValue = $state<T | undefined>(initialValue);

    return {
      get value() {
        return ssrValue as T;
      },
      set value(v: T) {
        ssrValue = v;
      },
      get lastUpdated() {
        return Date.now();
      },
      invalidate() {
        ssrValue = undefined;
      }
    };
  }

  const stateKey = key ?? Symbol() as StateKey;

  const { queryCache, mutationCache, getCacheEntry, setCacheEntry, getCacheLastUpdated } = getQueryGlobalState();
  const cache = type === CacheType.QUERY ? queryCache : mutationCache;

  // Set initial value if provided
  if (initialValue !== undefined && getCacheEntry<T>(cache, stateKey) === undefined) {
    setCacheEntry(cache, stateKey, initialValue, cacheTimeMs + 1);
  }

  return {
    get value() {
      return getCacheEntry<T>(cache, stateKey) as T;
    },

    set value(v: T) {
      setCacheEntry(cache, stateKey, v, cacheTimeMs + 1);
    },

    get lastUpdated() {
      return getCacheLastUpdated(cache, stateKey);
    },

    invalidate() {
      cache.delete(stateKey);
    }
  };
}
