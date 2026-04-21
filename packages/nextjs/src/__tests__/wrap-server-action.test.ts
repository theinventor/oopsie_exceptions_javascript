import type { OopsiePayload, Transport } from "@oopsie-exceptions/core";
import { afterEach, describe, expect, it } from "vitest";
import { configureServer, resetForTests } from "../singleton-server.js";
import { wrapServerAction } from "../wrap-server-action.js";

const payloads: OopsiePayload[] = [];
const transport: Transport = {
  send: async (_, p) => {
    payloads.push(p);
  },
};

afterEach(() => {
  resetForTests();
  payloads.length = 0;
});

function install() {
  configureServer({
    appName: "t",
    environment: "test",
    webhooks: [{ url: "https://x.com" }],
    transport,
    asyncDelivery: false,
  });
}

describe("wrapServerAction", () => {
  it("returns fn's result on success", async () => {
    install();
    const wrapped = wrapServerAction(async (a: number, b: number) => a + b);
    expect(await wrapped(2, 3)).toBe(5);
    expect(payloads).toHaveLength(0);
  });

  it("captures and rethrows on error", async () => {
    install();
    const wrapped = wrapServerAction(async () => {
      throw new Error("action boom");
    });
    await expect(wrapped()).rejects.toThrow("action boom");
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.error.message).toBe("action boom");
    expect(payloads[0]?.error.handled).toBe(false);
  });

  it("passes arguments through verbatim", async () => {
    install();
    const seen: unknown[] = [];
    const wrapped = wrapServerAction(async (...args: unknown[]) => {
      seen.push(...args);
      return "ok";
    });
    await wrapped("a", 1, { x: true });
    expect(seen).toEqual(["a", 1, { x: true }]);
  });

  it("still rethrows even when no client is configured", async () => {
    const wrapped = wrapServerAction(async () => {
      throw new Error("uncaptured");
    });
    await expect(wrapped()).rejects.toThrow("uncaptured");
  });
});
