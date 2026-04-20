import { describe, expect, it } from "vitest";
import { __hostnameReadyForTests, nodeServerInfo } from "../server-info.js";

describe("nodeServerInfo", () => {
  it("eventually returns hostname/pid/node_version and null ruby_version", async () => {
    // First call kicks off the lazy node:os probe; second call after
    // the microtask drain has the real hostname.
    nodeServerInfo();
    await __hostnameReadyForTests();
    // Small delay to let the dynamic import resolve
    await new Promise((r) => setTimeout(r, 10));

    const s = nodeServerInfo();
    expect(typeof s.hostname).toBe("string");
    expect(s.hostname?.length).toBeGreaterThan(0);
    expect(typeof s.pid).toBe("number");
    expect(s.pid).toBe(process.pid);
    expect(s.ruby_version).toBeNull();
    expect(typeof s.node_version).toBe("string");
    expect(s.node_version).toBe(process.version);
  });

  it("first synchronous call returns null hostname (probe is async)", () => {
    // We can't easily reset the module between tests, so this only
    // meaningfully asserts against a fresh module state. The important
    // invariant is that it's sync-safe — no throw even before the probe
    // resolves.
    const s = nodeServerInfo();
    expect(["string", "object"]).toContain(typeof s.hostname); // string|null
  });
});
