export function defer(callback: () => void): void {
  if (typeof setTimeout === "function") {
    setTimeout(callback, 0);
  } else {
    Promise.resolve()
      .then(() => Promise.resolve()
        .then(() => Promise.resolve()
          .then(callback)));
  }
}

// dedupe wrapper (works with sync and async functions)
export function dedupe<Args extends readonly unknown[], R>(
  fn: (...args: Args) => R | Promise<R>
) {
  type QueueItem = {
    args: Args;
    resolve: (value: R) => void;
    reject: (reason?: unknown) => void;
  };

  let queue: QueueItem[] = [];
  let scheduled = false;

  return (...args: Args): Promise<R> => {
    return new Promise<R>((resolve, reject) => {
      queue.push({ args, resolve, reject });

      if (!scheduled) {
        scheduled = true;
        defer(() => {
          const current = queue;
          queue = [];
          scheduled = false;

          try {
            const result = fn(...current[0].args);

            Promise.resolve(result).then(
              (resolved) => {
                for (const { resolve } of current) {
                  resolve(resolved);
                }
              },
              (err) => {
                for (const { reject } of current) {
                  reject(err);
                }
              }
            );
          } catch (err) {
            for (const { reject } of current) {
              reject(err);
            }
          }
        });
      }
    });
  };
}
