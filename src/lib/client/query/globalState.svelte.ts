import { browser } from "$app/environment";
import { SvelteMap } from "svelte/reactivity";

export type CacheEntry<T> = {
  value: T;
  lastUpdated: number;
  cacheTimeMs: number;
};

export type GlobalState = {
  queryCache: SvelteMap<string | symbol, CacheEntry<unknown>>;
  mutationCache: SvelteMap<string | symbol, CacheEntry<unknown>>;
};

let globalState: GlobalState | undefined;

let cleanupInterval: number | undefined;

// Automatic cleanup every 2 minutes
const startCleanupTimer = () => {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    if (!globalState) return;

    const now = Date.now();
    [globalState.queryCache, globalState.mutationCache].forEach(cache => {
      for (const [key, entry] of cache.entries()) {
        if (entry.cacheTimeMs !== Infinity && now - entry.lastUpdated > entry.cacheTimeMs) {
          cache.delete(key);
        }
      }
    });
  }, 2 * 60 * 1000); // Every 2 minutes
};

// Helper function to check if entry is expired without modifying cache
const isEntryExpired = (entry: CacheEntry<unknown>): boolean => {
  return entry.cacheTimeMs !== Infinity && Date.now() - entry.lastUpdated > entry.cacheTimeMs;
};

const getCacheEntry = <T>(cache: SvelteMap<string | symbol, CacheEntry<unknown>>, key: string | symbol): T | undefined => {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;

  // Check if expired but don't delete immediately during read access
  if (isEntryExpired(entry)) {
    // Schedule deletion for next tick to avoid state mutation during read
    setTimeout(() => {
      // Double-check entry still exists and is still expired
      const currentEntry = cache.get(key);
      if (currentEntry && isEntryExpired(currentEntry)) {
        console.log("Cache entry expired:", key);
        cache.delete(key);
      }
    }, 0);
    return undefined;
  }

  return entry.value;
};

const setCacheEntry = <T>(cache: SvelteMap<string | symbol, CacheEntry<unknown>>, key: string | symbol, value: T, cacheTimeMs: number) => {
  cache.set(key, {
    value,
    lastUpdated: Date.now(),
    cacheTimeMs
  });
};

const getCacheLastUpdated = (cache: SvelteMap<string | symbol, CacheEntry<unknown>>, key: string | symbol): number | undefined => {
  const entry = cache.get(key) as CacheEntry<unknown> | undefined;
  if (!entry) return undefined;

  // Check if expired but don't delete immediately during read access
  if (isEntryExpired(entry)) {
    // Schedule deletion for next tick
    setTimeout(() => {
      const currentEntry = cache.get(key);
      if (currentEntry && isEntryExpired(currentEntry)) {
        cache.delete(key);
      }
    }, 0);
    return undefined;
  }

  return entry.lastUpdated;
};

export const getQueryGlobalState = () => {
  if (!browser) return {} as GlobalState & { getCacheEntry: typeof getCacheEntry, setCacheEntry: typeof setCacheEntry, getCacheLastUpdated: typeof getCacheLastUpdated };

  if (!globalState) {
    globalState = {
      queryCache: new SvelteMap(),
      mutationCache: new SvelteMap()
    };
    startCleanupTimer();
  }

  return {
    ...globalState,
    getCacheEntry,
    setCacheEntry,
    getCacheLastUpdated
  };
};