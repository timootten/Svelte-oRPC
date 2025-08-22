import { onMount } from "svelte";

export function live<T, TReturn>(iterator: Promise<AsyncIteratorObject<T, TReturn, undefined>>) {
  let value = $state<T>();

  const startIteration = async () => {
    try {
      for await (const current of await iterator) {
        value = current;
      }
    } catch (error) {
      console.error('Error in live iterator:', error);
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
      return value;
    },
    set current(newValue: T | undefined) {
      value = newValue;
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
    } catch (error) {
      console.error('Error in live iterator:', error);
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