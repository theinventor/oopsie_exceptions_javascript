// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { browserServerInfo } from "../server-info.js";

describe("browserServerInfo", () => {
  it("captures userAgent, url, hostname, viewport", () => {
    const info = browserServerInfo();
    expect(info.ruby_version).toBeNull();
    expect(info.node_version).toBeNull();
    expect(info.pid).toBeNull();
    expect(typeof info.user_agent).toBe("string");
    expect(info.user_agent?.length).toBeGreaterThan(0);
    expect(typeof info.url).toBe("string");
    expect(info.url?.length).toBeGreaterThan(0);
    const viewport = info.viewport as { width: number; height: number };
    expect(viewport?.width).toBeGreaterThan(0);
    expect(viewport?.height).toBeGreaterThan(0);
  });

  it("returns null userAgent when navigator is unavailable", () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined,
    });
    try {
      expect(browserServerInfo().user_agent).toBeNull();
    } finally {
      if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    }
  });
});

describe("browserServerInfo SSR safety", () => {
  it("returns null fields when window is undefined", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error deliberately remove window
    globalThis.window = undefined;
    try {
      const info = browserServerInfo();
      expect(info.hostname).toBeNull();
      expect(info.url).toBeNull();
      expect(info.user_agent).toBeNull();
      expect(info.ruby_version).toBeNull();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns null hostname when reading window.location throws", () => {
    const originalLocation = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      configurable: true,
      get() {
        throw new Error("sandboxed access");
      },
    });
    try {
      const info = browserServerInfo();
      expect(info.hostname).toBeNull();
    } finally {
      if (originalLocation) Object.defineProperty(window, "location", originalLocation);
    }
  });
});
