// @vitest-environment jsdom
import { OopsieClient, type Transport } from "@oopsie-exceptions/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installGlobalHandlers, uninstallGlobalHandlers } from "../handlers.js";

// jsdom doesn't ship PromiseRejectionEvent; polyfill with a minimal shim.
if (typeof (globalThis as { PromiseRejectionEvent?: unknown }).PromiseRejectionEvent === "undefined") {
  class PromiseRejectionEventShim extends Event {
    readonly promise: Promise<unknown>;
    readonly reason: unknown;
    constructor(type: string, init: { promise: Promise<unknown>; reason: unknown; cancelable?: boolean }) {
      super(type, { cancelable: init.cancelable ?? true });
      this.promise = init.promise;
      this.reason = init.reason;
    }
  }
  (globalThis as unknown as { PromiseRejectionEvent: unknown }).PromiseRejectionEvent =
    PromiseRejectionEventShim;
}

function makeClient() {
  const sends: unknown[] = [];
  const transport: Transport = {
    send: async (_, payload) => {
      sends.push(payload);
    },
  };
  const client = new OopsieClient({
    appName: "t",
    environment: "test",
    webhooks: [{ url: "https://x.com" }],
    transport,
    asyncDelivery: false,
  });
  return { client, sends };
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("installGlobalHandlers (browser)", () => {
  it("attaches listeners for error and unhandledrejection", () => {
    const { client } = makeClient();
    const addSpy = vi.spyOn(window, "addEventListener");
    cleanups.push(installGlobalHandlers(client));
    const events = addSpy.mock.calls.map(([e]) => e);
    expect(events).toContain("error");
    expect(events).toContain("unhandledrejection");
  });

  it("captures an ErrorEvent", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));

    const err = new Error("boom");
    window.dispatchEvent(
      new ErrorEvent("error", {
        error: err,
        message: "boom",
        filename: "f.js",
        lineno: 10,
        colno: 2,
        cancelable: true,
      }),
    );
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toBe(err);
  });

  it("synthesizes an Error when the event lacks an .error", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));

    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "synthetic",
        filename: "f.js",
        cancelable: true,
      }),
    );
    expect(spy).toHaveBeenCalledOnce();
    const captured = spy.mock.calls[0]?.[0] as Error;
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toBe("synthetic");
  });

  it("captures a PromiseRejectionEvent (Error reason)", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));

    const reason = new Error("async");
    const promise = Promise.reject(reason);
    promise.catch(() => {});
    window.dispatchEvent(
      new PromiseRejectionEvent("unhandledrejection", {
        reason,
        promise,
        cancelable: true,
      }),
    );
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toBe(reason);
  });

  it("wraps non-Error rejection reasons", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));

    const promise = Promise.reject("nope");
    promise.catch(() => {});
    window.dispatchEvent(
      new PromiseRejectionEvent("unhandledrejection", {
        reason: "nope",
        promise,
        cancelable: true,
      }),
    );
    expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it("dedupes identical errors fired inside the 1s window", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));

    const err = new Error("dup");
    for (let i = 0; i < 3; i += 1) {
      window.dispatchEvent(
        new ErrorEvent("error", {
          error: err,
          message: "dup",
          filename: "f.js",
          lineno: 1,
          colno: 1,
          cancelable: true,
        }),
      );
    }
    expect(spy).toHaveBeenCalledOnce();
  });

  it("is idempotent — double install does not double-capture", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));
    cleanups.push(installGlobalHandlers(client));

    window.dispatchEvent(
      new ErrorEvent("error", {
        error: new Error("once"),
        message: "once",
        filename: "f.js",
        cancelable: true,
      }),
    );
    expect(spy).toHaveBeenCalledOnce();
  });

  it("uninstall removes listeners (verified via removeEventListener spy)", async () => {
    const { client } = makeClient();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const uninstall = installGlobalHandlers(client);
    uninstall();
    const events = removeSpy.mock.calls.map(([e]) => e);
    expect(events).toContain("error");
    expect(events).toContain("unhandledrejection");
  });

  it("uninstallGlobalHandlers helper also works", async () => {
    const { client } = makeClient();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    installGlobalHandlers(client);
    uninstallGlobalHandlers(client);
    expect(removeSpy).toHaveBeenCalled();
  });
});

describe("installGlobalHandlers SSR guard", () => {
  let originalWindow: typeof window;
  beforeEach(() => {
    originalWindow = globalThis.window;
  });
  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("throws a clear error when window is undefined", () => {
    const { client } = makeClient();
    // @ts-expect-error
    globalThis.window = undefined;
    expect(() => installGlobalHandlers(client)).toThrow(/browser environment/);
  });
});
