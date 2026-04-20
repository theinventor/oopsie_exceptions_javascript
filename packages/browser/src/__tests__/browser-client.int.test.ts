// @vitest-environment jsdom
/**
 * Integration test: install handlers → dispatch ErrorEvent →
 * captureException routes through buildPayload → BrowserTransport POSTs
 * to mocked fetch. Exercises the full browser pipeline.
 */
import { OopsieClient } from "@oopsie-exceptions/core";
import { describe, expect, it, vi } from "vitest";
import { installGlobalHandlers } from "../handlers.js";
import { browserServerInfo } from "../server-info.js";
import { BrowserTransport } from "../transport.js";

describe("integration: browser client end-to-end", () => {
  it("POSTs a valid payload on window 'error' event", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    const client = new OopsieClient({
      appName: "BrowserIntegration",
      environment: "test",
      webhooks: [{ url: "/api/oopsie", headers: { Authorization: "Bearer t" } }],
      transport: new BrowserTransport({ fetchImpl }),
      serverInfo: browserServerInfo,
      asyncDelivery: false,
      packageVersion: "0.1.0",
    });
    const uninstall = installGlobalHandlers(client);

    try {
      client.setContext({ user: { id: 1 } });
      const err = new Error("window boom");
      window.dispatchEvent(
        new ErrorEvent("error", {
          error: err,
          message: "window boom",
          filename: "app.js",
          lineno: 12,
          colno: 34,
        }),
      );
      await new Promise((r) => setTimeout(r, 5));

      expect(fetchImpl).toHaveBeenCalledOnce();
      const [url, init] = fetchImpl.mock.calls[0] ?? [];
      expect(url).toBe("/api/oopsie");
      expect(init?.keepalive).toBe(true);
      const body = JSON.parse(init?.body as string);
      expect(body.notifier).toBe("OopsieExceptions");
      expect(body.error.message).toBe("window boom");
      expect(body.error.handled).toBe(false);
      expect(body.context).toEqual({ user: { id: 1 } });
      expect(typeof body.server.user_agent).toBe("string");
    } finally {
      uninstall();
    }
  });
});
