import type { OopsiePayload, Transport, Webhook } from "@oopsie-exceptions/core";

/**
 * fetch-based HTTP transport for Node 20+. Mirrors the Ruby gem's
 * WebhookClient: Content-Type application/json, custom User-Agent,
 * webhook.headers passthrough, timeout via AbortSignal, non-2xx is a
 * warning rather than a throw (so async delivery logs but doesn't crash).
 */
export class NodeTransport implements Transport {
  constructor(private readonly opts: { userAgent?: string; fetchImpl?: typeof fetch } = {}) {}

  async send(webhook: Webhook, payload: OopsiePayload, opts: { timeoutMs: number }): Promise<void> {
    const fetchImpl = this.opts.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error("NodeTransport: global fetch unavailable — Node 18+ required");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const response = await fetchImpl(webhook.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.opts.userAgent ?? `OopsieExceptions/${payload.version}`,
          ...(webhook.headers ?? {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`webhook ${webhook.name ?? webhook.url} responded ${response.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
