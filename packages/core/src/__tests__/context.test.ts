import { describe, expect, it } from "vitest";
import { InMemoryContextStore } from "../context.js";

describe("InMemoryContextStore", () => {
  it("starts empty", () => {
    expect(new InMemoryContextStore().get()).toEqual({});
  });

  it("set replaces the entire context", () => {
    const s = new InMemoryContextStore();
    s.set({ a: 1 });
    s.set({ b: 2 });
    expect(s.get()).toEqual({ b: 2 });
  });

  it("merge shallow-merges into existing context", () => {
    const s = new InMemoryContextStore();
    s.set({ a: 1 });
    s.merge({ b: 2 });
    expect(s.get()).toEqual({ a: 1, b: 2 });
  });

  it("merge overwrites duplicated keys (shallow)", () => {
    const s = new InMemoryContextStore();
    s.set({ user: { id: 1 } });
    s.merge({ user: { id: 2 } });
    expect(s.get()).toEqual({ user: { id: 2 } });
  });

  it("clear resets to empty", () => {
    const s = new InMemoryContextStore();
    s.set({ a: 1 });
    s.clear();
    expect(s.get()).toEqual({});
  });

  it("withContext scopes and restores on success", async () => {
    const s = new InMemoryContextStore();
    s.set({ outer: 1 });
    const result = await s.withContext({ inner: 2 }, () => {
      expect(s.get()).toEqual({ outer: 1, inner: 2 });
      return "ok";
    });
    expect(result).toBe("ok");
    expect(s.get()).toEqual({ outer: 1 });
  });

  it("withContext restores even if fn throws", async () => {
    const s = new InMemoryContextStore();
    s.set({ outer: 1 });
    await expect(
      s.withContext({ inner: 2 }, () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(s.get()).toEqual({ outer: 1 });
  });

  it("withContext supports async fn", async () => {
    const s = new InMemoryContextStore();
    await s.withContext({ x: 1 }, async () => {
      await Promise.resolve();
      expect(s.get()).toEqual({ x: 1 });
    });
    expect(s.get()).toEqual({});
  });
});
