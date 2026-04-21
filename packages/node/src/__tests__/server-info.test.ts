import { afterEach, describe, expect, it } from "vitest";
import { __resetHostnameCacheForTests, nodeServerInfo } from "../server-info.js";

afterEach(() => {
  __resetHostnameCacheForTests();
});

describe("nodeServerInfo", () => {
  it("returns pid, node_version, null ruby_version (always)", () => {
    const s = nodeServerInfo();
    expect(s.ruby_version).toBeNull();
    expect(typeof s.pid).toBe("number");
    expect(s.pid).toBe(process.pid);
    expect(typeof s.node_version).toBe("string");
    expect(s.node_version).toBe(process.version);
  });

  it("reads hostname from process.env.HOSTNAME when set", () => {
    __resetHostnameCacheForTests();
    const prev = process.env.HOSTNAME;
    process.env.HOSTNAME = "sentinel-test-host";
    try {
      expect(nodeServerInfo().hostname).toBe("sentinel-test-host");
    } finally {
      if (prev === undefined) Reflect.deleteProperty(process.env, "HOSTNAME");
      else process.env.HOSTNAME = prev;
    }
  });

  it("returns null hostname when HOSTNAME env var is not set", () => {
    __resetHostnameCacheForTests();
    const prev = process.env.HOSTNAME;
    Reflect.deleteProperty(process.env, "HOSTNAME");
    try {
      expect(nodeServerInfo().hostname).toBeNull();
    } finally {
      if (prev !== undefined) process.env.HOSTNAME = prev;
    }
  });

  it("memoizes after first call", () => {
    process.env.HOSTNAME = "first-call";
    __resetHostnameCacheForTests();
    expect(nodeServerInfo().hostname).toBe("first-call");
    process.env.HOSTNAME = "second-call-ignored";
    expect(nodeServerInfo().hostname).toBe("first-call");
    Reflect.deleteProperty(process.env, "HOSTNAME");
  });
});
