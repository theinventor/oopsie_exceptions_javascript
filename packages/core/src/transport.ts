import type { Logger, OopsiePayload, Transport, Webhook } from "./types.js";

export class NoopTransport implements Transport {
  async send(): Promise<void> {
    // no-op; overridden by runtime packages (@oopsie-exceptions/node, /browser)
  }
}

/**
 * Deliver a payload to every webhook concurrently. Per-webhook failures
 * are isolated — one failing webhook must not block the others. Mirrors
 * Ruby gem's per-webhook error capture in WebhookClient.post.
 */
export async function sendAll(
  transport: Transport,
  webhooks: Webhook[],
  payload: OopsiePayload,
  opts: { timeoutMs: number; logger: Logger },
): Promise<void> {
  const results = await Promise.allSettled(
    webhooks.map((w) => transport.send(w, payload, { timeoutMs: opts.timeoutMs })),
  );
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result?.status === "rejected") {
      const webhook = webhooks[i];
      opts.logger.error(
        `delivery to ${webhook?.name ?? webhook?.url ?? "unknown"} failed`,
        result.reason,
      );
    }
  }
}
