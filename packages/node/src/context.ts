import { AsyncLocalStorage } from "node:async_hooks";
import type { ContextStore, OopsieContext } from "@oopsie-exceptions/core";

/**
 * AsyncLocalStorage-backed context store. Use in place of the default
 * InMemoryContextStore on servers so concurrent requests don't leak
 * context into each other — each async scope gets its own mutable
 * context box.
 *
 * Equivalent to the Ruby gem's Thread.current[...] pattern, adapted
 * for Node's async model.
 */
export class AsyncLocalStorageContextStore implements ContextStore {
  private readonly als = new AsyncLocalStorage<{ ctx: OopsieContext }>();
  private fallback: OopsieContext = {};

  get(): OopsieContext {
    return this.als.getStore()?.ctx ?? this.fallback;
  }

  set(ctx: OopsieContext): void {
    const store = this.als.getStore();
    if (store) {
      store.ctx = ctx;
    } else {
      this.fallback = ctx;
    }
  }

  merge(ctx: OopsieContext): void {
    const store = this.als.getStore();
    if (store) {
      store.ctx = { ...store.ctx, ...ctx };
    } else {
      this.fallback = { ...this.fallback, ...ctx };
    }
  }

  clear(): void {
    const store = this.als.getStore();
    if (store) {
      store.ctx = {};
    } else {
      this.fallback = {};
    }
  }

  async withContext<T>(ctx: OopsieContext, fn: () => T | Promise<T>): Promise<T> {
    const parent = this.get();
    const box = { ctx: { ...parent, ...ctx } };
    return this.als.run(box, async () => fn());
  }
}
