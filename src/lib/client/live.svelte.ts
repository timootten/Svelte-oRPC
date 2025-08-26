import { onMount } from "svelte";
import { liveCacheState } from "./cache";

export function live<T, TReturn>(iterator: Promise<AsyncIteratorObject<T, TReturn, undefined>>, key?: string) {
  const value = liveCacheState<T>("LIVE", key);

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

export function liveArray<T, TReturn>(iterator: Promise<AsyncIteratorObject<T | T[], TReturn, undefined>>, key?: string): { current: T[] } {
  const value = liveCacheState<T[]>("LIVE-ARRAY", key, []);

  const startIteration = async () => {
    try {
      for await (const current of await iterator) {
        if (Array.isArray(current)) {
          value.current = current; // Replace entire array
        } else {
          value.current = [...value.current, current]; // Append single item
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
      return value.current
    },
    set current(newValue: T[]) {
      value.current = newValue;
    }
  }
}