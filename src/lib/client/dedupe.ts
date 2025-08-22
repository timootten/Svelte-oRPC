import type { InterceptorOptions } from '@orpc/shared'
import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import { defer, isAsyncIteratorObject, stringifyJSON } from '@orpc/shared'
import { replicateStandardLazyResponse } from '@orpc/standard-server'
import { toBatchAbortSignal } from '@orpc/standard-server/batch'
import type { ClientContext } from '@orpc/client'
import type { StandardLinkClientInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'

type RequestResolver = (response: StandardLazyResponse) => void
type RequestRejector = (e: unknown) => void

export interface DedupeRequestsPluginGroup<T extends ClientContext> {
  condition(options: StandardLinkClientInterceptorOptions<T>): boolean
  /**
   * The context used for the rest of the request lifecycle.
   */
  context: T
}

export interface DedupeRequestsPluginOptions<T extends ClientContext> {
  /**
   * To enable deduplication, a request must match at least one defined group.
   * Requests that fall into the same group are considered for deduplication together.
   */
  groups: readonly [DedupeRequestsPluginGroup<T>, ...DedupeRequestsPluginGroup<T>[]]

  /**
   * Filters requests to dedupe
   *
   * @default (({ request }) => request.method === 'GET')
   */
  filter?: (options: StandardLinkClientInterceptorOptions<T>) => boolean
}

/**
 * Prevents duplicate requests by deduplicating similar ones to reduce server load.
 *
 * @see {@link https://orpc.unnoq.com/docs/plugins/dedupe-requests Dedupe Requests Plugin}
 */
export class DedupeRequestsPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly #groups: Exclude<DedupeRequestsPluginOptions<T>['groups'], undefined>
  readonly #filter: Exclude<DedupeRequestsPluginOptions<T>['filter'], undefined>

  order = 4_000_000 // make sure execute before batch plugin

  readonly #queue: Map<
    DedupeRequestsPluginGroup<T>,
    {
      options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, Promise<StandardLazyResponse>>
      signals: (AbortSignal | undefined)[]
      resolves: RequestResolver[]
      rejects: RequestRejector[]
    }[]
  > = new Map()

  constructor(options: NoInfer<DedupeRequestsPluginOptions<T>>) {
    this.#groups = options.groups
    this.#filter = options.filter ?? (({ request }) => request.method === 'GET')
  }

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.push((options) => {
      if (
        options.request.body instanceof Blob
        || options.request.body instanceof FormData
        || options.request.body instanceof URLSearchParams
        || isAsyncIteratorObject(options.request.body)
        || !this.#filter(options)
      ) {
        return options.next()
      }

      const group = this.#groups.find(group => group.condition(options))

      if (!group) {
        return options.next()
      }

      return new Promise((resolve, reject) => {
        this.#enqueue(group, options, resolve, reject)
        defer(() => this.#dequeue())
      })
    })
  }

  #enqueue(
    group: DedupeRequestsPluginGroup<T>,
    options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, Promise<StandardLazyResponse>>,
    resolve: RequestResolver,
    reject: RequestRejector,
  ): void {
    let queue = this.#queue.get(group)

    if (!queue) {
      this.#queue.set(group, queue = [])
    }

    const matched = queue.find((item) => {
      const requestString1 = stringifyJSON({
        body: item.options.request.body,
        headers: item.options.request.headers,
        method: item.options.request.method,
        url: item.options.request.url,
      } satisfies Omit<StandardRequest, 'signal'>)

      const requestString2 = stringifyJSON({
        body: options.request.body,
        headers: options.request.headers,
        method: options.request.method,
        url: options.request.url,
      } satisfies Omit<StandardRequest, 'signal'>)

      return requestString1 === requestString2
    })

    if (matched) {
      matched.signals.push(options.request.signal)
      matched.resolves.push(resolve)
      matched.rejects.push(reject)
    }
    else {
      queue.push({
        options,
        signals: [options.request.signal],
        resolves: [resolve],
        rejects: [reject],
      })
    }
  }

  async #dequeue(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [group, items] of this.#queue) {
      for (const { options, signals, resolves, rejects } of items) {
        promises.push(
          this.#execute(group, options, signals, resolves, rejects),
        )
      }
    }

    this.#queue.clear()
    await Promise.all(promises)
  }

  async #execute(
    group: DedupeRequestsPluginGroup<T>,
    options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, Promise<StandardLazyResponse>>,
    signals: (AbortSignal | undefined)[],
    resolves: RequestResolver[],
    rejects: RequestRejector[],
  ): Promise<void> {
    try {
      const dedupedRequest: StandardRequest = {
        ...options.request,
        signal: toBatchAbortSignal(signals),
      }

      const response = await options.next({
        ...options,
        request: dedupedRequest,
        signal: dedupedRequest.signal,
        context: group.context,
      })

      const iterator = await response.body() as AsyncIterator<unknown, void, undefined>

      const replicatedIterators = replicateIteratorAsBody(iterator, resolves.length);

      // 2. Resolve each promise with its own unique iterator.
      if (replicatedIterators.length !== resolves.length) {
        throw new Error('Mismatch between number of resolves and replicated iterators');
      }

      for (const resolve of resolves) {
        resolve(replicatedIterators.shift()!);
      }
    }
    catch (error) {
      for (const reject of rejects) {
        reject(error)
      }
    }
  }
}
// Define the shape of the object we want to create
type BodyProvider<T> = {
  body: () => Promise<AsyncIterator<T>>;
};

/**
 * Replicates a single AsyncIterator into multiple objects, each with a `body()`
 * method that returns a new, independent AsyncIterator for the data.
 *
 * @param iterator The single-use source AsyncIterator.
 * @param count The number of replicated objects to create.
 * @returns An array of objects, each conforming to the BodyProvider shape.
 */
function replicateIteratorAsBody<T>(
  iterator: AsyncIterator<T>,
  count: number,
): BodyProvider<T>[] {
  if (count <= 0) {
    return [];
  }

  // 1. Convert the single iterator into a broadcast source (a ReadableStream).
  const sourceStream = iteratorToStream(iterator);

  if (count === 1) {
    // If only one is needed, wrap the source stream directly.
    return [
      {
        async body(): Promise<AsyncIterator<T>> {
          return sourceStream.values();
        },
      },
    ];
  }

  // 2. Use tee() to create multiple stream branches.
  const teedStreams = sourceStream.tee();
  const branches: ReadableStream<T>[] = [teedStreams[0]];
  let streamToTee = teedStreams[1];

  for (let i = 2; i < count; i++) {
    const [branch1, branch2] = streamToTee.tee();
    branches.push(branch1);
    streamToTee = branch2;
  }
  branches.push(streamToTee);

  // 3. Map each stream branch to the desired object structure.
  return branches.map((branch) => ({
    /**
     * This async method, when called, returns a promise that resolves
     * to a new async iterator for its dedicated stream branch.
     */
    async body(): Promise<AsyncIterator<T>> {
      return branch.values();
    },
  }));
}
/**
 * Converts an AsyncIterator into a ReadableStream.
 * The stream will pull data from the iterator and enqueue it.
 * @param iterator The source async iterator.
 * @returns A ReadableStream that yields the values from the iterator.
 */
function iteratorToStream<T>(
  iterator: AsyncIterator<T>,
): ReadableStream<T> {
  // Wrap the iterator so it can be used in for-await-of
  const asyncIterable = {
    [Symbol.asyncIterator]() {
      return iterator;
    }
  };

  return new ReadableStream<T>({
    async start(controller) {
      try {
        for await (const chunk of asyncIterable) {
          // As we get a chunk from the source, enqueue it into the stream.
          controller.enqueue(chunk);
        }
        // When the iterator is done, close the stream.
        controller.close();
      } catch (e) {
        // If the iterator throws an error, propagate it to the stream.
        controller.error(e);
      }
    },
  });
}