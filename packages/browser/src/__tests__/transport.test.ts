// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { BrowserTransport } from "../transport.js";
import type { OopsiePayload, Webhook } from "@oopsie-exceptions/core";

const payload = (): OopsiePayload => ({
  notifier: "OopsieExceptions",
  version: "0.1.0",
  timestamp: "2026-04-20T00:00:00.000Z",
  app: { name: "t", environment: "test" },
  error: {
    class_name: "Error",
    message: "x",
    backtrace: null,
    first_line: null,
    causes: [],
    handled: false,
  },
  context: {},
  server: { hostname: null, pid: null, ruby_version: null },
});

const okResponse = (): Response => new Response(null, { status: 200 });

describe("BrowserTransport", () => {
  it("POSTs JSON with keepalive:true and same-origin credentials", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const t = new BrowserTransport({ fetchImpl });
    const webhook: Webhook = { url: "/api/oopsie", name: "h" };
    await t.send(webhook, payload(), { timeoutMs: 5000 });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.keepalive).toBe(true);
    expect(init?.credentials).toBe("same-origin");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("passes webhook.headers through (Authorization)", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const t = new BrowserTransport({ fetchImpl });
    await t.send(
      { url: "/h", headers: { Authorization: "Bearer x" } },
      payload(),
      { timeoutMs: 5000 },
    );
    const init = fetchImpl.mock.calls[0]?.[1];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer x");
  });

  it("throws on non-2xx responses", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("bad", { status: 503 }));
    const t = new BrowserTransport({ fetchImpl });
    await expect(
      t.send({ url: "/x", name: "h" }, payload(), { timeoutMs: 5000 }),
    ).rejects.toThrow(/responded 503/);
  });

  it("throws if global fetch is unavailable", async () => {
    const original = globalThis.fetch;
    // @ts-expect-error temp
    globalThis.fetch = undefined;
    try {
      const t = new BrowserTransport();
      await expect(
        t.send({ url: "/x" }, payload(), { timeoutMs: 1000 }),
      ).rejects.toThrow(/fetch unavailable/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
