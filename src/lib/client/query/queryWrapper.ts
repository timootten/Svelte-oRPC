/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ClientContext, NestedClient } from "@orpc/client";

type WrappedClient<T> = T extends (...args: infer A) => Promise<AsyncIteratorObject<infer U, any, undefined>>
  ? {
    (...args: A): U & { key: string }
  }
  : T extends (...args: infer A) => infer R
  ? (...args: A) => R & { key: string }
  : T extends object
  ? { [K in keyof T]: WrappedClient<T[K]> }
  : T;

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

      const result = new LazyPromise(() => current(...args), "planet.list");

      return result
    }
  }) as WrappedClient<T>;
}

class LazyPromise<T> {
  key: string;
  private factory: () => Promise<T>;
  private _promise?: Promise<T>;

  constructor(factory: () => Promise<T>, key: string) {
    this.factory = factory;
    this.key = key;
  }

  private get promise(): Promise<T> {
    if (!this._promise) {
      this._promise = this.factory();
    }
    return this._promise;
  }

  then = (...args: any) => this.promise.then(...args);
  catch = (...args: any) => this.promise.catch(...args);
  finally = (...args: any) => this.promise.finally(...args);
}


export const createQuery = <C extends ClientContext, N extends NestedClient<C>>(client: N): WrappedClient<N> => {
  return createWrapper(client);
};
