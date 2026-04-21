// @vitest-environment jsdom
import type { Transport } from "@oopsie-exceptions/core";
import { afterEach, describe, expect, it } from "vitest";
import { captureException as captureClient } from "../capture-exception.js";
import { captureException as captureServer } from "../instrumentation.js";
import { configureServer, resetServerForTests } from "../singleton-server.js";
import { configureClient, resetClientSideForTests } from "../singleton.js";

const sentPayloads: unknown[] = [];
const recordingTransport: Transport = {
  send: async (_w, p) => {
    sentPayloads.push(p);
  },
};

afterEach(() => {
  resetClientSideForTests();
  resetServerForTests();
  sentPayloads.length = 0;
});

describe("captureException (nextjs)", () => {
  it("browser variant is a no-op when no client-side client is configured", async () => {
    await expect(captureClient(new Error("x"))).resolves.toBeUndefined();
    expect(sentPayloads).toHaveLength(0);
  });

  it("browser variant routes to the client-side singleton", async () => {
    configureClient({
      appName: "t",
      environment: "test",
      webhooks: [{ url: "https://x.com" }],
      transport: recordingTransport,
      asyncDelivery: false,
    });
    await captureClient(new Error("client hello"));
    expect(sentPayloads).toHaveLength(1);
  });

  it("/instrumentation variant routes to the server singleton", async () => {
    configureServer({
      appName: "t",
      environment: "test",
      webhooks: [{ url: "https://x.com" }],
      transport: recordingTransport,
      asyncDelivery: false,
    });
    await captureServer(new Error("server hello"));
    expect(sentPayloads).toHaveLength(1);
  });
});
