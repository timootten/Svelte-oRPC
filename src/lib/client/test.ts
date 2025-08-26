import type { ClientContext, NestedClient } from "@orpc/client";

// Helper to convert path to array
const toArray = (path: string | string[] = []) => {
  return Array.isArray(path) ? path : [path];
};

// Wrap the client call to return { value, key }
function createWrappedProcedureUtils(client: any, options: { path: string[] }) {
  return {
    call: (...args: any[]) => {
      const result = client(...args);
      return {
        value: result,
        key: options.path.join('.')
      };
    }
  };
}

function createRouterUtils(client: any, options: { path?: string[] } = {}) {
  const path = toArray(options.path);
  const procedureUtils = createWrappedProcedureUtils(client, { path });

  const recursive = new Proxy(procedureUtils, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (typeof prop !== "string") {
        return value;
      }

      // Create next level utils
      const nextUtils = createRouterUtils(client[prop], {
        ...options,
        path: [...path, prop]
      });

      // If current target has this function, return it
      if (typeof value === "function") {
        return new Proxy(value, {
          get(_, prop2) {
            return Reflect.get(nextUtils, prop2);
          }
        });
      }

      // Otherwise return the next utils
      return nextUtils;
    }
  });

  return recursive;
}

export const testOrpc = <C extends ClientContext, N extends NestedClient<C>>(client: N) => {
  return createRouterUtils(client);
};
