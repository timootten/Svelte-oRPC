import { onMount } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const liveCache = new SvelteMap<symbol | string, unknown>();

export function liveCacheState<T>(key?: string, initialValue?: T) {
  const stateKey = key ? key : Symbol();

  // Initialize with the provided value if not already in cache
  if (!liveCache.has(stateKey) && initialValue !== undefined) {
    liveCache.set(stateKey, initialValue);
  }

  return {
    get current(): T | undefined {
      return liveCache.get(stateKey) as T | undefined;
    },
    set current(newValue: T | undefined) {
      if (newValue === undefined) {
        liveCache.delete(stateKey);
      } else {
        liveCache.set(stateKey, newValue);
      }
    },
  }
}

export function live<T, TReturn>(iterator: Promise<AsyncIteratorObject<T, TReturn, undefined>>, key?: string) {
  const value = liveCacheState<T>(key);

  const startIteration = async () => {
    try {
      for await (const current of await iterator) {
        value.current = current;
      }
    } catch {
      // Handle error
    }
  };

  const stopIteration = async () => {
    (await iterator).return?.();
  };

  // Start the iteration in the background
  onMount(() => {
    startIteration();
    return () => stopIteration();
  });

  return {
    get current(): T | undefined {
      return value.current as T | undefined;
    },
    set current(newValue: T | undefined) {
      value.current = newValue;
    }
  }
}

export function liveArray<T, TReturn>(iterator: Promise<AsyncIteratorObject<T | T[], TReturn, undefined>>): { current: T[] } {
  let value = $state<T[]>([]);

  const startIteration = async () => {
    try {
      for await (const current of await iterator) {
        if (Array.isArray(current)) {
          value = current; // Replace entire array
        } else {
          value = [...value, current]; // Append single item
        }
        console.log("Current value:", current);
      }
    } catch {
      // Handle error
    }
  };

  const stopIteration = async () => {
    (await iterator).return?.();
  };

  // Start the iteration in the background
  onMount(() => {
    startIteration();
    return () => stopIteration();
  });

  return {
    get current(): T[] {
      return value;
    },
    set current(newValue: T[]) {
      value = newValue;
    }
  }
}