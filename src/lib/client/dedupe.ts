import type { InterceptorOptions } from '@orpc/shared';
import type {
  StandardLazyResponse,
  StandardRequest,
} from '@orpc/standard-server';
import {
  AsyncIdQueue,
  AsyncIteratorClass,
  defer,
  isAsyncIteratorObject,
  once,
  stringifyJSON,
} from '@orpc/shared';
import { toBatchAbortSignal } from '@orpc/standard-server/batch';
import type { ClientContext } from '@orpc/client';
import type {
  StandardLinkClientInterceptorOptions,
  StandardLinkOptions,
  StandardLinkPlugin,
} from '@orpc/client/standard';

type RequestResolver = (response: StandardLazyResponse) => void;
type RequestRejector = (e: unknown) => void;

export interface DedupeRequestsPluginGroup<T extends ClientContext> {
  condition(options: StandardLinkClientInterceptorOptions<T>): boolean;
  context: T;
}

export interface DedupeRequestsPluginOptions<T extends ClientContext> {
  groups: readonly [
    DedupeRequestsPluginGroup<T>,
    ...DedupeRequestsPluginGroup<T>[],
  ];
  filter?: (options: StandardLinkClientInterceptorOptions<T>) => boolean;
}

export class DedupeRequestsPlugin<T extends ClientContext>
  implements StandardLinkPlugin<T> {
  readonly #groups: Exclude<
    DedupeRequestsPluginOptions<T>['groups'],
    undefined
  >;
  readonly #filter: Exclude<
    DedupeRequestsPluginOptions<T>['filter'],
    undefined
  >;

  order = 4_000_000;

  readonly #queue: Map<
    DedupeRequestsPluginGroup<T>,
    {
      options: InterceptorOptions<
        StandardLinkClientInterceptorOptions<T>,
        Promise<StandardLazyResponse>
      >;
      signals: (AbortSignal | undefined)[];
      resolves: RequestResolver[];
      rejects: RequestRejector[];
    }[]
  > = new Map();

  constructor(options: NoInfer<DedupeRequestsPluginOptions<T>>) {
    this.#groups = options.groups;
    this.#filter = options.filter ?? (({ request }) => request.method === 'GET');
  }

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= [];
    options.clientInterceptors.push((options) => {
      if (
        options.request.body instanceof Blob ||
        options.request.body instanceof FormData ||
        options.request.body instanceof URLSearchParams ||
        isAsyncIteratorObject(options.request.body) ||
        !this.#filter(options)
      ) {
        return options.next();
      }
      const group = this.#groups.find((group) => group.condition(options));
      if (!group) {
        return options.next();
      }
      return new Promise((resolve, reject) => {
        this.#enqueue(group, options, resolve, reject);
        defer(() => this.#dequeue());
      });
    });
  }

  #enqueue(
    group: DedupeRequestsPluginGroup<T>,
    options: InterceptorOptions<
      StandardLinkClientInterceptorOptions<T>,
      Promise<StandardLazyResponse>
    >,
    resolve: RequestResolver,
    reject: RequestRejector,
  ): void {
    let queue = this.#queue.get(group);
    if (!queue) {
      this.#queue.set(group, (queue = []));
    }
    const matched = queue.find((item) => {
      const requestString1 = stringifyJSON({
        body: item.options.request.body,
        headers: item.options.request.headers,
        method: item.options.request.method,
        url: item.options.request.url,
      } satisfies Omit<StandardRequest, 'signal'>);
      const requestString2 = stringifyJSON({
        body: options.request.body,
        headers: options.request.headers,
        method: options.request.method,
        url: options.request.url,
      } satisfies Omit<StandardRequest, 'signal'>);
      return requestString1 === requestString2;
    });
    if (matched) {
      matched.signals.push(options.request.signal);
      matched.resolves.push(resolve);
      matched.rejects.push(reject);
    } else {
      queue.push({
        options,
        signals: [options.request.signal],
        resolves: [resolve],
        rejects: [reject],
      });
    }
  }

  async #dequeue(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [group, items] of this.#queue) {
      for (const { options, signals, resolves, rejects } of items) {
        promises.push(this.#execute(group, options, signals, resolves, rejects));
      }
    }
    this.#queue.clear();
    await Promise.all(promises);
  }

  async #execute(
    group: DedupeRequestsPluginGroup<T>,
    options: InterceptorOptions<
      StandardLinkClientInterceptorOptions<T>,
      Promise<StandardLazyResponse>
    >,
    signals: (AbortSignal | undefined)[],
    resolves: RequestResolver[],
    rejects: RequestRejector[],
  ): Promise<void> {
    try {
      const dedupedRequest: StandardRequest = {
        ...options.request,
        signal: toBatchAbortSignal(signals),
      };
      const response = await options.next({
        ...options,
        request: dedupedRequest,
        signal: dedupedRequest.signal,
        context: group.context,
      });
      const replicatedResponses = replicateStandardLazyResponse(
        response,
        resolves.length,
      );
      for (const resolve of resolves) {
        resolve(replicatedResponses.shift()!);
      }
    } catch (error) {
      for (const reject of rejects) {
        reject(error);
      }
    }
  }
}

export function replicateStandardLazyResponse(
  response: StandardLazyResponse,
  count: number,
): StandardLazyResponse[] {
  if (count <= 0) {
    return [];
  }

  const replicatedIteratorsPromise = once(async () => {
    const body = await response.body();
    if (!isAsyncIteratorObject(body)) {
      return body;
    }
    return replicateAsyncIterator(body, count);
  })();

  const replicatedResponses: StandardLazyResponse[] = [];

  for (let i = 0; i < count; i++) {
    replicatedResponses.push({
      headers: response.headers,
      status: response.status,
      body: async () => {
        const result = await replicatedIteratorsPromise;
        if (!Array.isArray(result)) {
          return result;
        }
        const iterator = result[i];
        if (!iterator) {
          throw new Error(
            `Replication failed: No iterator found for index ${i}`,
          );
        }
        return iterator;
      },
    });
  }

  return replicatedResponses;
}

export function replicateAsyncIterator<T, TReturn, TNext>(
  source: AsyncIterator<T, TReturn, TNext>,
  count: number,
): AsyncIteratorClass<T, TReturn, TNext>[] {
  if (count <= 0) {
    return [];
  }

  const queues: (AsyncIdQueue<IteratorResult<T, TReturn>> & { id: string })[] =
    [];
  const replicated: AsyncIteratorClass<T, TReturn, TNext>[] = [];

  const start = once(async () => {
    try {
      while (true) {
        const item = await source.next();
        for (const queue of queues) {
          if (queue.isOpen(queue.id)) {
            queue.push(queue.id, item);
          }
        }
        if (item.done) {
          break;
        }
      }
    } catch (e) {
      for (const queue of queues) {
        if (queue.isOpen(queue.id)) {
          queue.close({ id: queue.id, reason: e });
        }
      }
    }
  });

  for (let id = 0; id < count; id++) {
    const queue = new AsyncIdQueue<
      IteratorResult<T, TReturn>
    >() as AsyncIdQueue<IteratorResult<T, TReturn>> & { id: string };
    const queueId = id.toString();
    queue.id = queueId;
    queue.open(queueId);
    queues.push(queue);

    replicated.push(
      new AsyncIteratorClass(
        () => {
          start();
          return queue.pull(queueId);
        },
        async (reason) => {
          queue.close({ id: queueId });
          if (reason !== 'next') {
            const isAllClosed = queues.every((q) => !q.isOpen(q.id));
            if (isAllClosed) {
              await source?.return?.();
            }
          }
        },
      ),
    );
  }

  return replicated;
}