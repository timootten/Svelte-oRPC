import { onMount } from 'svelte';

type AsyncIteratorObject<T, TReturn, TNext> = AsyncIterator<
  T,
  TReturn,
  TNext
> & {
  [Symbol.asyncIterator](): AsyncIterator<T, TReturn, TNext>;
};

/**
 * Creates a shared, reactive query object from an async iterator.
 * This object manages a single underlying iterator and shares its state
 * among all consumers.
 *
 * @param iteratorPromise A promise that resolves to an async iterator.
 */
export function createLiveQuery<T, TReturn>(
  iteratorPromise: Promise<AsyncIteratorObject<T, TReturn, undefined>>,
) {
  // 1. Create a single, shared state for this query
  let value = $state<T>();
  let refCount = 0;
  let iterator: AsyncIteratorObject<T, TReturn, undefined> | null = null;
  let isIterating = false;

  const start = async () => {
    if (isIterating) return;
    isIterating = true;
    console.log('Starting live query iteration...');

    try {
      iterator = await iteratorPromise;
      for await (const current of iterator) {
        value = current;
      }
      console.log('Live query iterator completed.', iterator);
    } catch (error) {
      // Don't log cancellation errors, which are common
      if (
        !(error instanceof DOMException && error.name === 'AbortError')
      ) {
        console.error('Error in live query iterator:', error);
      }
    } finally {
      console.log('Live query iteration stopped.');
      isIterating = false;
      iterator = null;
    }
  };

  const stop = async () => {
    if (iterator) {
      await iterator.return?.();
    }
  };

  // 2. Return a "store-like" object
  return {
    /**
     * A reactive accessor for the iterator's current value.
     * Reading this property within a Svelte component will establish a subscription.
     */
    get current(): T | undefined {
      // 3. Use onMount to manage the lifecycle
      onMount(() => {
        refCount++;
        // Start the iterator only when the first component mounts
        if (refCount === 1) {
          start();
        }

        return () => {
          refCount--;
          // Stop the iterator only when the last component unmounts
          if (refCount === 0) {
            stop();
          }
        };
      });
      return value;
    },

    /**
     * Allows manually setting the state. This will be reflected
     * in all components using this query.
     */
    set current(newValue: T | undefined) {
      value = newValue;
    },
  };
}