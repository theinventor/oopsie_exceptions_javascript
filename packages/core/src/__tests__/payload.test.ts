import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../config.js";
import { buildPayload } from "../payload.js";
import rubyPayload from "./fixtures/ruby-payload.json" with { type: "json" };

const cfg = () =>
  normalizeConfig({
    appName: "MyApp",
    environment: "production",
    webhooks: [{ url: "https://x.com" }],
    packageVersion: "0.1.0",
  });

describe("buildPayload", () => {
  it("has the same top-level shape as the Ruby fixture", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(Object.keys(p).sort()).toEqual(Object.keys(rubyPayload).sort());
  });

  it("app block matches Ruby shape (name + environment)", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(Object.keys(p.app).sort()).toEqual(Object.keys(rubyPayload.app).sort());
    expect(p.app).toEqual({ name: "MyApp", environment: "production" });
  });

  it("error block mirrors Ruby keys exactly", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(Object.keys(p.error).sort()).toEqual(Object.keys(rubyPayload.error).sort());
  });

  it("notifier is the frozen string 'OopsieExceptions'", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(p.notifier).toBe("OopsieExceptions");
    expect(p.notifier).toBe(rubyPayload.notifier);
  });

  it("timestamp is ISO 8601 with Z", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(p.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("server.ruby_version is null for JS (parity pin)", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(p.server.ruby_version).toBeNull();
  });

  it("server has node_version", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(typeof p.server.node_version).toBe("string");
  });

  it("error.handled defaults to false", () => {
    const p = buildPayload(new Error("x"), cfg());
    expect(p.error.handled).toBe(false);
  });

  it("error.handled respects opts.handled = true", () => {
    const p = buildPayload(new Error("x"), cfg(), { handled: true });
    expect(p.error.handled).toBe(true);
  });

  it("error.class_name reflects the constructor name", () => {
    class DatabaseError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "DatabaseError";
      }
    }
    const p = buildPayload(new DatabaseError("boom"), cfg());
    expect(p.error.class_name).toBe("DatabaseError");
  });

  it("error.message is truncated to 10000 chars", () => {
    const p = buildPayload(new Error("x".repeat(20000)), cfg());
    expect(p.error.message.length).toBe(10_000);
  });

  it("walks error.cause chain like the Ruby gem", () => {
    const inner = new Error("inner");
    const outer = new Error("outer", { cause: inner });
    const p = buildPayload(outer, cfg());
    expect(p.error.causes).toHaveLength(1);
    expect(p.error.causes[0]?.message).toBe("inner");
  });

  it("merges ambient context with capture-time context; opts win on key collision", () => {
    const config = cfg();
    config.contextStore.set({ user: { id: 1 }, base: true });
    const p = buildPayload(new Error("x"), config, { context: { user: { id: 2 } } });
    expect(p.context).toEqual({ user: { id: 2 }, base: true });
  });

  it("applies filterParameters to context (redacts matching keys)", () => {
    const config = cfg();
    config.contextStore.set({ password: "s3cret", user: { password: "u", name: "n" } });
    const p = buildPayload(new Error("x"), config);
    expect(p.context).toEqual({
      password: "[FILTERED]",
      user: { password: "[FILTERED]", name: "n" },
    });
  });

  it("version comes from config.packageVersion", () => {
    const config = normalizeConfig({
      appName: "a",
      environment: "e",
      webhooks: [{ url: "https://x.com" }],
      packageVersion: "1.2.3",
    });
    const p = buildPayload(new Error("x"), config);
    expect(p.version).toBe("1.2.3");
  });

  it("handles non-Error inputs (string, object)", () => {
    const p1 = buildPayload("something went wrong", cfg());
    expect(p1.error.message).toBe("something went wrong");
    expect(p1.error.class_name).toBe("Error");

    const p2 = buildPayload({ message: "obj" }, cfg());
    expect(p2.error.message).toBe("obj");
  });
});
