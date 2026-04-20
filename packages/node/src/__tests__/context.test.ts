import { describe, expect, it } from "vitest";
import { AsyncLocalStorageContextStore } from "../context.js";

describe("AsyncLocalStorageContextStore", () => {
  it("isolates context across concurrent withContext scopes", async () => {
    const store = new AsyncLocalStorageContextStore();

    const a = store.withContext({ tenant: "a" }, async () => {
      await new Promise((r) => setTimeout(r, 20));
      return store.get().tenant;
    });
    const b = store.withContext({ tenant: "b" }, async () => {
      await new Promise((r) => setTimeout(r, 10));
      return store.get().tenant;
    });

    const [aResult, bResult] = await Promise.all([a, b]);
    expect(aResult).toBe("a");
    expect(bResult).toBe("b");
  });

  it("merges parent context into nested scope", async () => {
    const store = new AsyncLocalStorageContextStore();
    await store.withContext({ layer: "outer", keep: true }, async () => {
      await store.withContext({ layer: "inner" }, async () => {
        expect(store.get()).toEqual({ layer: "inner", keep: true });
      });
      expect(store.get()).toEqual({ layer: "outer", keep: true });
    });
  });

  it("set/merge/clear work inside a scope", async () => {
    const store = new AsyncLocalStorageContextStore();
    await store.withContext({}, async () => {
      store.set({ a: 1 });
      expect(store.get()).toEqual({ a: 1 });
      store.merge({ b: 2 });
      expect(store.get()).toEqual({ a: 1, b: 2 });
      store.clear();
      expect(store.get()).toEqual({});
    });
  });

  it("set/merge/clear fall back to ambient when no ALS scope is active", () => {
    const store = new AsyncLocalStorageContextStore();
    store.set({ a: 1 });
    expect(store.get()).toEqual({ a: 1 });
    store.merge({ b: 2 });
    expect(store.get()).toEqual({ a: 1, b: 2 });
    store.clear();
    expect(store.get()).toEqual({});
  });

  it("changes inside a scope do not leak to ambient", async () => {
    const store = new AsyncLocalStorageContextStore();
    store.set({ ambient: true });
    await store.withContext({}, async () => {
      store.set({ transient: true });
      expect(store.get()).toEqual({ transient: true });
    });
    expect(store.get()).toEqual({ ambient: true });
  });
});
