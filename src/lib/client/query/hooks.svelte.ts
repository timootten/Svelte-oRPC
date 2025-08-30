import { onMount } from "svelte";
import { CacheState, CacheType, getCacheManager, type CacheOptions, type StateKey } from "./cache.svelte";
import type { LazyPromise } from "./lazyPromise";

export type QueryKey = StateKey;
export type QueryInput<T> = LazyPromise<T>;

export type QueryOptions<T> = CacheOptions<T> & {
  overrideKey?: QueryKey;
  retry?: number;
  retryDelay?: number;
};

export type QueryResult<T, QO extends QueryOptions<T> | undefined = undefined> = ({
  get isLoading(): true;
  get value(): QO extends { initialValue: T } ? T : T | undefined;
  set value(v: QO extends { initialValue: T } ? T : T | undefined);
  get error(): Error | undefined;
  get isStale(): boolean;
} | {
  get isLoading(): false;
  get value(): T;
  set value(v: T);
  get error(): Error | undefined;
  get isStale(): boolean;
}) & {
  onLoading(callback: () => void): void;
  refetch(): Promise<void>;
};

export function useQuery<
  T,
  O extends QueryOptions<T> | undefined = undefined
>(
  query: QueryInput<T>,
  queryOptions?: O
): QueryResult<T, O> {
  const key = queryOptions?.overrideKey ?? query.key;
  const { retry = 0, retryDelay = 1000 } = queryOptions ?? {};

  const cache = CacheState<T, O>(CacheType.QUERY, key, queryOptions);
  const cacheManager = getCacheManager();

  let error = $state<Error | undefined>();
  let isExecuting = $state(false);

  const isLoading = $derived(cache.value === undefined && !error);

  const executeQuery = async (retryCount = 0): Promise<void> => {
    isExecuting = true;
    try {
      const result = await query.run();
      cache.value = result;
      error = undefined;
    } catch (err) {
      const queryError = err instanceof Error ? err : new Error(String(err));

      if (retryCount < retry) {
        setTimeout(() => {
          executeQuery(retryCount + 1);
        }, retryDelay);
      } else {
        error = queryError;
        console.error('Query failed after retries:', queryError);
      }
    } finally {
      isExecuting = false;
    }
  };

  const shouldFetch = (): boolean => {
    // Wenn keine Daten da sind, immer fetchen
    if (cache.value === undefined) return true;

    // Wenn Daten da sind aber stale, auch fetchen
    if (cache.isStale) return true;

    // Sonst nicht fetchen
    return false;
  };

  const tryQuery = async () => {
    if (shouldFetch() && !isExecuting) {
      await executeQuery();
    }
  };

  const refetch = async () => {
    error = undefined;
    await executeQuery();
  };

  onMount(() => {
    cacheManager.addActiveQuery(key);

    // Nur fetchen wenn nötig (keine Daten oder stale)
    tryQuery();

    return () => {
      cacheManager.removeActiveQuery(key);
    };
  });

  return {
    get isLoading() {
      return isLoading;
    },
    get value() {
      return cache.value as T;
    },
    set value(v) {
      cache.value = v;
      error = undefined;
    },
    get error() {
      return error;
    },
    get isStale() {
      return cache.isStale;
    },
    onLoading(callback) {
      if (isLoading) {
        callback();
      }
    },
    refetch
  };
}
