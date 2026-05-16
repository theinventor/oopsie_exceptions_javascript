import { describe, expect, it, vi } from "vitest";
import { OopsieClient } from "../client.js";
import type { ClientConfig, OopsiePayload, Transport, Webhook } from "../types.js";

type Capture = { webhook: Webhook; payload: OopsiePayload };

function makeRecordingTransport(): { transport: Transport; calls: Capture[] } {
  const calls: Capture[] = [];
  const transport: Transport = {
    send: async (webhook, payload) => {
      calls.push({ webhook, payload });
    },
  };
  return { transport, calls };
}

function baseConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    appName: "TestApp",
    environment: "test",
    webhooks: [{ url: "https://x.com", name: "x" }],
    asyncDelivery: false,
    ...overrides,
  };
}

describe("OopsieClient.captureException", () => {
  it("sends a payload to every webhook in sync mode", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(
      baseConfig({
        transport,
        webhooks: [
          { url: "https://a.com", name: "a" },
          { url: "https://b.com", name: "b" },
        ],
      }),
    );
    await client.captureException(new Error("boom"));
    expect(calls).toHaveLength(2);
    expect(calls[0]?.payload.error.message).toBe("boom");
  });

  it("returns immediately when async (does not await delivery)", async () => {
    let resolveDelivery: (() => void) | undefined;
    const transport: Transport = {
      send: () =>
        new Promise<void>((resolve) => {
          resolveDelivery = resolve;
        }),
    };
    const client = new OopsieClient(baseConfig({ transport, asyncDelivery: true }));
    const started = Date.now();
    await client.captureException(new Error("x"));
    expect(Date.now() - started).toBeLessThan(50);
    resolveDelivery?.();
  });

  it("logs async delivery failures", async () => {
    const failure = new Error("network down");
    const transport: Transport = {
      send: async () => {
        throw failure;
      },
    };
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
    };
    const client = new OopsieClient(baseConfig({ transport, asyncDelivery: true, logger }));
    await client.captureException(new Error("x"));
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalledWith("delivery to x failed", failure);
  });

  it("is a no-op when enabled: false", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport, enabled: false }));
    await client.captureException(new Error("x"));
    expect(calls).toHaveLength(0);
  });

  it("drops errors whose class name matches a string in ignoreErrors", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport, ignoreErrors: ["AbortError"] }));
    class AbortError extends Error {
      override name = "AbortError";
    }
    await client.captureException(new AbortError("x"));
    await client.captureException(new Error("real"));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload.error.class_name).toBe("Error");
  });

  it("drops errors whose class name or message matches a regex", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport, ignoreErrors: [/not found/i] }));
    await client.captureException(new Error("user not found"));
    await client.captureException(new Error("boom"));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload.error.message).toBe("boom");
  });

  it("can ignore non-Error objects by regex-matching their message", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport, ignoreErrors: [/42/] }));
    await client.captureException({ name: "ObjectError", message: 42 });
    await client.captureException({ name: "ObjectError", message: "real" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload.error.message).toBe("real");
  });

  it("drops errors whose matcher function returns true", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(
      baseConfig({
        transport,
        ignoreErrors: [(e) => e.message.startsWith("ignore:")],
      }),
    );
    await client.captureException(new Error("ignore: noisy"));
    await client.captureException(new Error("real"));
    expect(calls).toHaveLength(1);
  });

  it("ignores matcher function failures and still sends", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(
      baseConfig({
        transport,
        ignoreErrors: [
          () => {
            throw new Error("matcher failed");
          },
        ],
      }),
    );
    await client.captureException(new Error("real"));
    expect(calls).toHaveLength(1);
  });

  it("applies beforeNotify transformations before sending", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(
      baseConfig({
        transport,
        beforeNotify: (p) => {
          p.context.deploy_sha = "abc123";
          return p;
        },
      }),
    );
    await client.captureException(new Error("x"));
    expect(calls[0]?.payload.context.deploy_sha).toBe("abc123");
  });

  it("drops the notification when beforeNotify returns null", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport, beforeNotify: () => null }));
    await client.captureException(new Error("x"));
    expect(calls).toHaveLength(0);
  });

  it("drops the notification when beforeNotify throws (and logs)", async () => {
    const { transport, calls } = makeRecordingTransport();
    const logged: string[] = [];
    const client = new OopsieClient(
      baseConfig({
        transport,
        beforeNotify: () => {
          throw new Error("hook boom");
        },
        logger: {
          warn: () => {},
          error: (msg) => logged.push(msg),
        },
      }),
    );
    await client.captureException(new Error("x"));
    expect(calls).toHaveLength(0);
    expect(logged.some((m) => m.includes("beforeNotify"))).toBe(true);
  });

  it("accepts async beforeNotify", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(
      baseConfig({
        transport,
        beforeNotify: async (p) => {
          await Promise.resolve();
          p.context.asyncTouched = true;
          return p;
        },
      }),
    );
    await client.captureException(new Error("x"));
    expect(calls[0]?.payload.context.asyncTouched).toBe(true);
  });
});

describe("OopsieClient context API", () => {
  it("setContext / mergeContext / clearContext work", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport }));

    client.setContext({ user: { id: 1 } });
    client.mergeContext({ action: "show" });
    await client.captureException(new Error("x"));
    expect(calls[0]?.payload.context).toEqual({ user: { id: 1 }, action: "show" });

    client.clearContext();
    await client.captureException(new Error("y"));
    expect(calls[1]?.payload.context).toEqual({});
  });

  it("withContext scopes context for a block", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig({ transport }));

    await client.withContext({ tenant: "acme" }, async () => {
      await client.captureException(new Error("inner"));
    });
    await client.captureException(new Error("outer"));
    expect(calls[0]?.payload.context).toEqual({ tenant: "acme" });
    expect(calls[1]?.payload.context).toEqual({});
  });
});

describe("OopsieClient.use (plugins)", () => {
  it("invokes plugin with config + captureException", () => {
    const spy = vi.fn();
    const client = new OopsieClient(baseConfig());
    const ret = client.use((api) => {
      spy(api);
    });
    expect(ret).toBe(client);
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0]?.[0];
    expect(arg.config.appName).toBe("TestApp");
    expect(typeof arg.captureException).toBe("function");
  });

  it("plugins can swap the transport at runtime", async () => {
    const { transport, calls } = makeRecordingTransport();
    const client = new OopsieClient(baseConfig());
    client.use((api) => {
      api.config.transport = transport;
    });
    await client.captureException(new Error("routed"));
    expect(calls).toHaveLength(1);
  });
});
