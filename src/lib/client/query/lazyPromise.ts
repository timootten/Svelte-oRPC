/* eslint-disable @typescript-eslint/no-explicit-any */
export class LazyPromise<T> extends Promise<T> {
  key: string;
  private factory: () => Promise<T>;
  private _promise?: Promise<T>;

  constructor(factory: () => Promise<T>, key: string) {
    let resolver!: (value: T | PromiseLike<T>) => void;
    let rejecter!: (reason?: any) => void;

    // Dummy executor – wir rufen resolve/reject erst später
    super((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    this.factory = factory;
    this.key = key;

    // Promise erzeugen und weiterleiten
    this._promise = undefined;

    Object.defineProperty(this, "_resolver", { value: resolver });
    Object.defineProperty(this, "_rejecter", { value: rejecter });
  }

  private get promise(): Promise<T> {
    if (!this._promise) {
      this._promise = this.factory();
    }
    return this._promise;
  }

  /** Erzwingt einen neuen Aufruf der Factory */
  run(): Promise<T> {
    this._promise = this.factory();
    return this._promise;
  }

  // Promise-Methoden weiterreichen
  override then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  override catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.promise.catch(onrejected);
  }

  override finally(onfinally?: (() => void) | null): Promise<T> {
    return this.promise.finally(onfinally);
  }
}
