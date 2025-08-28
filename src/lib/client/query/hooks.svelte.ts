import { onMount } from "svelte";
import { CacheState, CacheType, type CacheOptions } from "./cache.svelte";

export type QueryInput<T> = Promise<T> & { key: string };

export type QueryOptions<T> = CacheOptions<T> & {
  overrideKey?: string;
}

export type QueryResult<T, QO extends QueryOptions<T> | undefined = undefined> = ({
  get isLoading(): true;
  get value(): QO extends { initialValue: T } ? T : T | undefined;
  set value(v: QO extends { initialValue: T } ? T : T | undefined);
} | {
  get isLoading(): false;
  get value(): T;
  set value(v: T);
}) & {
  onLoading(callback: () => void): void;
};

export function useQuery<
  T,
  O extends QueryOptions<T> | undefined = undefined
>(
  query: QueryInput<T>,
  queryOptions?: O
): QueryResult<T, O> {
  const cache = CacheState<T, O>(
    CacheType.QUERY,
    queryOptions?.overrideKey ? queryOptions.overrideKey : query.key,
    queryOptions
  );

  const isLoading = $derived(cache.value === undefined);

  onMount(async () => {
    if (cache.value === undefined) {
      try {
        const result = await query;
        cache.value = result;
      } catch (error) {
        console.error('Query failed:', error);
      }
    }
  });

  return {
    get isLoading() {
      return isLoading;
    },
    get value() {
      console.log("Value: ", cache.value)
      return cache.value as T;
    },
    set value(v) {
      cache.value = v;
    },
    onLoading(callback) {
      if (cache.value === undefined) {
        callback();
      }
    }
  };
}