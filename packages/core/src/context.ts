import type { ContextStore, OopsieContext } from "./types.js";

/**
 * Default in-memory context store. A single ambient context per store
 * instance — fine for browser and simple Node, but concurrent server
 * code should use @oopsie-exceptions/node's AsyncLocalStorage-backed
 * store to avoid request-level context bleed.
 *
 * Mirrors Ruby gem's Thread.current[:oopsie_exceptions_context] semantics.
 */
export class InMemoryContextStore implements ContextStore {
  private ctx: OopsieContext = {};

  get(): OopsieContext {
    return this.ctx;
  }

  set(ctx: OopsieContext): void {
    this.ctx = ctx;
  }

  merge(ctx: OopsieContext): void {
    this.ctx = { ...this.ctx, ...ctx };
  }

  clear(): void {
    this.ctx = {};
  }

  async withContext<T>(ctx: OopsieContext, fn: () => T | Promise<T>): Promise<T> {
    const prev = this.ctx;
    this.ctx = { ...prev, ...ctx };
    try {
      return await fn();
    } finally {
      this.ctx = prev;
    }
  }
}
