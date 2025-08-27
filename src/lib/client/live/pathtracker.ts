/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ClientContext, NestedClient } from "@orpc/client";
import { live, liveArray } from "./live.svelte";

type LiveState<T> = {
  current: T | undefined;
};

type LiveArrayState<T> = {
  current: T[];
};

type WrappedClient<T> = T extends (...args: infer A) => Promise<AsyncIteratorObject<infer U, any, undefined>>
  ? {
    (...args: A): LiveState<U>;
    asArray(...args: A): LiveArrayState<U extends unknown[] ? U[number] : U>;
  }
  : T extends (...args: infer A) => infer R
  ? (...args: A) => LiveState<R>
  : T extends object
  ? { [K in keyof T]: WrappedClient<T[K]> }
  : T;

function createWrapper<T>(client: T, path: string[] = []): WrappedClient<T> {
  return new Proxy(() => { }, {
    get(_, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;

      // Handle special .asArray method
      if (prop === 'asArray') {
        return (...args: any[]) => {
          let current: any = client;
          for (const part of path) {
            current = current[part];
          }
          const result = current(...args);
          return liveArray(result, path.join('.'));
        };
      }

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

      const result = current(...args);
      return live(result, path.join('.'));
    }
  }) as WrappedClient<T>;
}


export const testOrpc = <C extends ClientContext, N extends NestedClient<C>>(client: N): WrappedClient<N> => {
  return createWrapper(client);
};
