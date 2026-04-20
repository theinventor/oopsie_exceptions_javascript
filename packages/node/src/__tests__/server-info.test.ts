import { describe, expect, it } from "vitest";
import { nodeServerInfo } from "../server-info.js";

describe("nodeServerInfo", () => {
  it("returns hostname, pid, node_version, and null ruby_version", () => {
    const s = nodeServerInfo();
    expect(typeof s.hostname).toBe("string");
    expect(s.hostname?.length).toBeGreaterThan(0);
    expect(typeof s.pid).toBe("number");
    expect(s.pid).toBe(process.pid);
    expect(s.ruby_version).toBeNull();
    expect(typeof s.node_version).toBe("string");
    expect(s.node_version).toBe(process.version);
  });
});
