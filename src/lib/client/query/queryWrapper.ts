/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ClientContext, ClientPromiseResult, NestedClient } from "@orpc/client";
import { LazyPromise } from "./lazyPromise";

type WrappedClient<T> =
  // Funktionen ⇒ LazyPromise<entfalteter Rückgabewert>
  T extends (...args: infer A) => any
  ? (...args: A) => LazyPromise<Unwrap<ReturnType<T>>>
  // Rekursiv für verschachtelte Objekte
  : T extends object
  ? { [K in keyof T]: WrappedClient<T[K]> }
  : never;

type Unwrap<T> =
  T extends ClientPromiseResult<infer U, any> ? U :
  T extends Promise<infer U> ? U :
  T;

function createWrapper<T>(client: T, path: string[] = []): WrappedClient<T> {
  return new Proxy(() => { }, {
    get(_, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;

      return createWrapper(client, [...path, prop as string]);
    },

    apply(_, __, args) {
      let current: any = client;
      for (const part of path) {
        current = current[part];
        if (current === undefined) {
          throw new Error(`Path "${path.join('.')}" not found`);
        }
      }

      if (typeof current !== 'function') {
        throw new Error(`"${path.join('.')}" is not a function`);
      }

      type Result = Unwrap<ReturnType<typeof current>>;

      // LazyPromise<Result> statt LazyPromise<Promise<Result>>
      const promise = new LazyPromise<Result>(
        () => current(...args) as Promise<Result>,
        path.join('.')
      );

      return promise
    }
  }) as WrappedClient<T>;
}


export const createQuery = <C extends ClientContext, N extends NestedClient<C>>(client: N): WrappedClient<N> => {
  return createWrapper(client);
};
