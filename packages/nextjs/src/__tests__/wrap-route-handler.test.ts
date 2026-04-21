import type { OopsiePayload, Transport } from "@oopsie-exceptions/core";
import { afterEach, describe, expect, it } from "vitest";
import { configureServer, resetForTests } from "../singleton-server.js";
import { wrapRouteHandler } from "../wrap-route-handler.js";

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

describe("wrapRouteHandler", () => {
  it("returns the handler's Response on success", async () => {
    install();
    const wrapped = wrapRouteHandler(async (_req: Request) => {
      return new Response("ok", { status: 200 });
    });
    const res = await wrapped(new Request("https://x.com/api"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(payloads).toHaveLength(0);
  });

  it("captures and rethrows on handler error", async () => {
    install();
    const wrapped = wrapRouteHandler(async () => {
      throw new Error("route boom");
    });
    await expect(wrapped(new Request("https://x.com/"))).rejects.toThrow("route boom");
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.error.message).toBe("route boom");
  });

  it("passes Request (and extra args) through", async () => {
    install();
    const seen: { url: string; ctxPassed: boolean } = { url: "", ctxPassed: false };
    const wrapped = wrapRouteHandler(async (req: Request, ctx: { params: unknown }) => {
      seen.url = req.url;
      seen.ctxPassed = ctx.params !== undefined;
      return new Response(null, { status: 204 });
    });
    await wrapped(new Request("https://x.com/users/1"), { params: { id: "1" } });
    expect(seen.url).toBe("https://x.com/users/1");
    expect(seen.ctxPassed).toBe(true);
  });
});
