/**
 * Integration test: withContext nesting + restoration across async
 * boundaries using the default InMemoryContextStore.
 */
import { describe, expect, it } from "vitest";
import { OopsieClient } from "../client.js";
import type { OopsiePayload, Transport } from "../types.js";

describe("integration: context propagation via withContext", () => {
  it("restores outer context after nested blocks — even when inner throws", async () => {
    const received: OopsiePayload[] = [];
    const transport: Transport = {
      send: async (_, payload) => {
        received.push(payload);
      },
    };
    const client = new OopsieClient({
      appName: "a",
      environment: "e",
      webhooks: [{ url: "https://x.com" }],
      transport,
      asyncDelivery: false,
    });

    client.setContext({ layer: "base" });

    await client.withContext({ layer: "outer", trace: 1 }, async () => {
      await client.captureException(new Error("outer"));
      try {
        await client.withContext({ layer: "inner" }, async () => {
          await client.captureException(new Error("inner"));
          throw new Error("boom");
        });
      } catch {
        // swallow so the test continues
      }
      await client.captureException(new Error("still-outer"));
    });
    await client.captureException(new Error("back-to-base"));

    expect(received[0]?.context).toEqual({ layer: "outer", trace: 1 });
    expect(received[1]?.context).toEqual({ layer: "inner", trace: 1 });
    expect(received[2]?.context).toEqual({ layer: "outer", trace: 1 });
    expect(received[3]?.context).toEqual({ layer: "base" });
  });

  it("opts.context passed to captureException wins over ambient context for same keys", async () => {
    const received: OopsiePayload[] = [];
    const transport: Transport = {
      send: async (_, payload) => {
        received.push(payload);
      },
    };
    const client = new OopsieClient({
      appName: "a",
      environment: "e",
      webhooks: [{ url: "https://x.com" }],
      transport,
      asyncDelivery: false,
    });
    client.setContext({ user: { id: 1 }, keep: true });
    await client.captureException(new Error("x"), { context: { user: { id: 999 } } });
    expect(received[0]?.context).toEqual({ user: { id: 999 }, keep: true });
  });
});
