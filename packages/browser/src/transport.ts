import type { OopsiePayload, Transport, Webhook } from "@oopsie-exceptions/core";

/**
 * Browser fetch transport. Uses `keepalive: true` so in-flight reports
 * survive page unload (e.g. when the error fires just before navigation).
 */
export class BrowserTransport implements Transport {
  constructor(private readonly opts: { fetchImpl?: typeof fetch } = {}) {}

  async send(webhook: Webhook, payload: OopsiePayload, opts: { timeoutMs: number }): Promise<void> {
    const fetchImpl = this.opts.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error("BrowserTransport: global fetch unavailable");
    }

    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), opts.timeoutMs)
      : null;

    try {
      const init: RequestInit = {
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(webhook.headers ?? {}),
        },
        body: JSON.stringify(payload),
      };
      if (controller) init.signal = controller.signal;
      const response = await fetchImpl(webhook.url, init);

      if (!response.ok) {
        throw new Error(
          `webhook ${webhook.name ?? webhook.url} responded ${response.status}`,
        );
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
