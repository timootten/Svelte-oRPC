import { browser } from "$app/environment";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

export enum CacheType {
  QUERY = "QUERY",
  MUTATION = "MUTATION",
}

export type StateKey = string | symbol;

export type CacheOptions<T> = {
  initialValue?: T;
  staleTimeMs?: number;  // Zeit bis Daten als "stale" gelten
  cacheTimeMs?: number;  // Zeit bis Daten komplett gelöscht werden
};

type CacheEntry<T> = {
  value: T;
  lastUpdated: number;
  cacheTimeMs: number;
  staleTimeMs: number;
};

class CacheManager {
  private queryCache = new SvelteMap<StateKey, CacheEntry<unknown>>();
  private mutationCache = new SvelteMap<StateKey, CacheEntry<unknown>>();
  private activeQueries = new SvelteSet<StateKey>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    if (browser) {
      this.startCleanupTimer();
    }
  }

  private getCache(type: CacheType) {
    return type === CacheType.QUERY ? this.queryCache : this.mutationCache;
  }

  private isEntryExpired(entry: CacheEntry<unknown>): boolean {
    return entry.cacheTimeMs !== Infinity &&
      Date.now() - entry.lastUpdated > entry.cacheTimeMs;
  }

  private isEntryStale(entry: CacheEntry<unknown>): boolean {
    return entry.staleTimeMs !== Infinity &&
      Date.now() - entry.lastUpdated > entry.staleTimeMs;
  }

  private startCleanupTimer() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      [this.queryCache, this.mutationCache].forEach(cache => {
        for (const [key, entry] of cache.entries()) {
          // Don't delete if query is active or entry hasn't expired
          if (this.activeQueries.has(key)) return;
          if (entry.cacheTimeMs === Infinity) return;
          if (now - entry.lastUpdated <= entry.cacheTimeMs) return;

          cache.delete(key);
        }
      });
    }, 2 * 60 * 1000);
  }

  addActiveQuery(key: StateKey) {
    this.activeQueries.add(key);
  }

  removeActiveQuery(key: StateKey) {
    this.activeQueries.delete(key);
  }

  get<T>(type: CacheType, key: StateKey): T | undefined {
    const cache = this.getCache(type);
    const entry = cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return undefined;

    // If expired and not actively queried, schedule cleanup
    if (this.isEntryExpired(entry) && !this.activeQueries.has(key)) {
      setTimeout(() => {
        const currentEntry = cache.get(key);
        if (currentEntry && this.isEntryExpired(currentEntry)) {
          cache.delete(key);
        }
      }, 0);
      return undefined;
    }

    return entry.value;
  }

  // Neue Methode: prüft ob Daten stale sind (aber trotzdem verwendet werden können)
  isStale(type: CacheType, key: StateKey): boolean {
    const cache = this.getCache(type);
    const entry = cache.get(key);

    if (!entry) return true;
    if (this.isEntryExpired(entry)) return true;

    return this.isEntryStale(entry);
  }

  set<T>(type: CacheType, key: StateKey, value: T, cacheTimeMs: number, staleTimeMs: number = 0) {
    const cache = this.getCache(type);
    cache.set(key, {
      value,
      lastUpdated: Date.now(),
      cacheTimeMs,
      staleTimeMs
    });
  }

  getLastUpdated(type: CacheType, key: StateKey): number | undefined {
    const cache = this.getCache(type);
    const entry = cache.get(key);

    if (!entry) return undefined;
    if (this.isEntryExpired(entry) && !this.activeQueries.has(key)) {
      return undefined;
    }

    return entry.lastUpdated;
  }

  invalidate(type: CacheType, key: StateKey) {
    const cache = this.getCache(type);
    cache.delete(key);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Singleton instance
let cacheManager: CacheManager | undefined;

function getCacheManager(): CacheManager {
  if (!browser) {
    // Return a mock for SSR
    return {
      addActiveQuery: () => { },
      removeActiveQuery: () => { },
      get: () => undefined,
      set: () => { },
      isStale: () => true,
      getLastUpdated: () => undefined,
      invalidate: () => { },
      destroy: () => { }
    } as unknown as CacheManager;
  }

  if (!cacheManager) {
    cacheManager = new CacheManager();
  }

  return cacheManager;
}

export type CacheResult<T, CO extends CacheOptions<T> | undefined = undefined> = {
  get value(): CO extends { initialValue: T } ? T : T | undefined;
  set value(v: CO extends { initialValue: T } ? T : T | undefined);
  get lastUpdated(): number | undefined;
  get isStale(): boolean;
  invalidate(): void;
};

export function CacheState<
  T,
  CO extends CacheOptions<T> | undefined = undefined
>(
  type: CacheType,
  key: StateKey,
  options?: CO
): CacheResult<T, CO> {
  const { initialValue, cacheTimeMs = 5 * 60 * 1000, staleTimeMs = 1000 } = options ?? {};
  const cache = getCacheManager();

  if (!browser) {
    // SSR fallback
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
      get isStale() {
        return false;
      },
      invalidate() {
        ssrValue = undefined;
      }
    };
  }

  // Set initial value if provided and not exists
  if (initialValue !== undefined && cache.get<T>(type, key) === undefined) {
    cache.set(type, key, initialValue, cacheTimeMs, staleTimeMs);
  }

  return {
    get value() {
      return cache.get<T>(type, key) as T;
    },

    set value(v: T) {
      cache.set(type, key, v, cacheTimeMs, staleTimeMs);
    },

    get lastUpdated() {
      return cache.getLastUpdated(type, key);
    },

    get isStale() {
      return cache.isStale(type, key);
    },

    invalidate() {
      cache.invalidate(type, key);
    }
  };
}

export { getCacheManager };
