/**
 * Integration test: captureException -> payload builder -> filters ->
 * fan-out. Uses a mocked fetch-style transport so no network.
 */
import { describe, expect, it } from "vitest";
import { OopsieClient } from "../client.js";
import type { Transport } from "../types.js";

describe("integration: client -> payload -> transport fan-out", () => {
  it("delivers one fully-built payload per webhook; filters applied; context attached", async () => {
    const received: { url: string; body: unknown }[] = [];
    const transport: Transport = {
      send: async (webhook, payload) => {
        received.push({ url: webhook.url, body: payload });
      },
    };

    const client = new OopsieClient({
      appName: "IntegrationApp",
      environment: "test",
      webhooks: [
        { url: "https://prod.example.com", name: "prod" },
        { url: "https://slack.example.com", name: "slack" },
      ],
      transport,
      asyncDelivery: false,
      packageVersion: "9.9.9",
    });

    client.setContext({
      user: { id: 42, password: "raw" },
      request: { url: "/users/42" },
    });

    await client.captureException(new Error("integration boom"), {
      context: { action: "users#show" },
    });

    expect(received).toHaveLength(2);
    const [first, second] = received;
    expect(first?.body).toEqual(second?.body);

    const body = first?.body as import("../types.js").OopsiePayload;
    expect(body.notifier).toBe("OopsieExceptions");
    expect(body.version).toBe("9.9.9");
    expect(body.app).toEqual({ name: "IntegrationApp", environment: "test" });
    expect(body.error.message).toBe("integration boom");
    expect(body.error.handled).toBe(false);
    expect(body.context).toEqual({
      user: { id: 42, password: "[FILTERED]" },
      request: { url: "/users/42" },
      action: "users#show",
    });
  });

  it("one failing webhook does not block the other", async () => {
    let bCalled = false;
    const transport: Transport = {
      send: async (webhook) => {
        if (webhook.name === "a") throw new Error("a is down");
        bCalled = true;
      },
    };

    const logged: string[] = [];
    const client = new OopsieClient({
      appName: "a",
      environment: "e",
      webhooks: [
        { url: "https://a.example.com", name: "a" },
        { url: "https://b.example.com", name: "b" },
      ],
      transport,
      asyncDelivery: false,
      logger: {
        warn: () => {},
        error: (msg) => logged.push(msg),
      },
    });

    await client.captureException(new Error("x"));
    expect(bCalled).toBe(true);
    expect(logged.some((m) => m.includes("delivery to a failed"))).toBe(true);
  });
});
