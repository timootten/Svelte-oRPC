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

/*
IDEE: entweder durch remove vom cache refetch ausführen oder refetch ausführen mit global EventEmitter für mutate und query
und refetch methode adden

key bei mutate und query ist unterschiedlich, überlegen was man da machen kann
entweder manuell setzen, oder bei "planets.create" auch "planets.list" updaten also alles was in planets drin wäre?
so wie in Svelte, mutation hat ein .updates(oprc.planets.list())
*/