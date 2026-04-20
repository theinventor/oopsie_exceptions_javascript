import type { OopsiePayload, Webhook } from "@oopsie-exceptions/core";
import { describe, expect, it, vi } from "vitest";
import { NodeTransport } from "../transport.js";

const samplePayload = (): OopsiePayload => ({
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

describe("NodeTransport", () => {
  it("POSTs JSON with Content-Type and default User-Agent", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const t = new NodeTransport({ fetchImpl });
    const webhook: Webhook = { url: "https://hook.example.com", name: "h" };
    await t.send(webhook, samplePayload(), { timeoutMs: 5000 });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://hook.example.com");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["User-Agent"]).toMatch(/^OopsieExceptions\//);
    expect(JSON.parse(init?.body as string).notifier).toBe("OopsieExceptions");
  });

  it("passes through webhook.headers (bearer token)", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const t = new NodeTransport({ fetchImpl });
    const webhook: Webhook = {
      url: "https://x.com",
      headers: { Authorization: "Bearer tkn_abc" },
    };
    await t.send(webhook, samplePayload(), { timeoutMs: 5000 });
    const init = fetchImpl.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tkn_abc");
  });

  it("honors custom userAgent option", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const t = new NodeTransport({ fetchImpl, userAgent: "custom/1.0" });
    await t.send({ url: "https://x.com" }, samplePayload(), { timeoutMs: 5000 });
    const init = fetchImpl.mock.calls[0]?.[1];
    expect((init?.headers as Record<string, string>)["User-Agent"]).toBe("custom/1.0");
  });

  it("throws on non-2xx responses", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("bad", { status: 500 }));
    const t = new NodeTransport({ fetchImpl });
    await expect(
      t.send({ url: "https://x.com", name: "h" }, samplePayload(), { timeoutMs: 5000 }),
    ).rejects.toThrow(/responded 500/);
  });

  it("aborts via AbortSignal on timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });
    const t = new NodeTransport({ fetchImpl });
    await expect(
      t.send({ url: "https://x.com" }, samplePayload(), { timeoutMs: 10 }),
    ).rejects.toThrow(/aborted/);
  });

  it("throws a clear error if global fetch is unavailable", async () => {
    const t = new NodeTransport({ fetchImpl: undefined as unknown as typeof fetch });
    const original = globalThis.fetch;
    // @ts-expect-error temporarily remove
    globalThis.fetch = undefined;
    try {
      await expect(
        t.send({ url: "https://x.com" }, samplePayload(), { timeoutMs: 10 }),
      ).rejects.toThrow(/fetch unavailable/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
