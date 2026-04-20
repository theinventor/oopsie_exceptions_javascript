import type { Transport } from "@oopsie-exceptions/core";
import { afterEach, describe, expect, it } from "vitest";
import { captureException } from "../capture-exception.js";
import { configureServer, resetForTests } from "../singleton.js";

const sentPayloads: unknown[] = [];
const recordingTransport: Transport = {
  send: async (_w, p) => {
    sentPayloads.push(p);
  },
};

afterEach(() => {
  resetForTests();
  sentPayloads.length = 0;
});

describe("captureException (nextjs)", () => {
  it("is a no-op when no client is initialized", async () => {
    await expect(captureException(new Error("x"))).resolves.toBeUndefined();
    expect(sentPayloads).toHaveLength(0);
  });

  it("routes to the server singleton in a Node context", async () => {
    configureServer({
      appName: "t",
      environment: "test",
      webhooks: [{ url: "https://x.com" }],
      transport: recordingTransport,
      asyncDelivery: false,
    });
    await captureException(new Error("hello"));
    expect(sentPayloads).toHaveLength(1);
  });
});
