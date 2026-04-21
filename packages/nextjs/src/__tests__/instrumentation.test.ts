import type { OopsiePayload, Transport } from "@oopsie-exceptions/core";
import { afterEach, describe, expect, it } from "vitest";
import { onRequestError, register } from "../instrumentation.js";
import { configureServer, resetForTests } from "../singleton-server.js";

const payloads: OopsiePayload[] = [];
const transport: Transport = {
  send: async (_w, p) => {
    payloads.push(p);
  },
};

afterEach(() => {
  resetForTests();
  payloads.length = 0;
});

function installClient() {
  configureServer({
    appName: "Next",
    environment: "test",
    webhooks: [{ url: "https://x.com" }],
    transport,
    asyncDelivery: false,
  });
}

describe("register", () => {
  it("is a no-op when no env vars are set and no client was configured first", () => {
    expect(() => register()).not.toThrow();
  });
});

describe("onRequestError", () => {
  const fakeRequest = {
    path: "/api/users/42",
    method: "POST",
    headers: { "content-type": "application/json" },
  };

  it("is a no-op when no client is initialized", async () => {
    await onRequestError(new Error("x"), fakeRequest, {
      routerKind: "App Router",
      routePath: "/api/users/[id]",
      routeType: "route",
    });
    expect(payloads).toHaveLength(0);
  });

  it("forwards Route Handler errors with route + request context", async () => {
    installClient();
    await onRequestError(new Error("boom"), fakeRequest, {
      routerKind: "App Router",
      routePath: "/api/users/[id]",
      routeType: "route",
    });
    expect(payloads).toHaveLength(1);
    const p = payloads[0];
    expect(p?.error.message).toBe("boom");
    expect(p?.error.handled).toBe(false);
    const nextjs = p?.context.nextjs as Record<string, unknown>;
    expect(nextjs.router).toBe("App Router");
    expect(nextjs.route).toBe("/api/users/[id]");
    expect(nextjs.type).toBe("route");
    const req = p?.context.request as Record<string, unknown>;
    expect(req.url).toBe("/api/users/42");
    expect(req.method).toBe("POST");
  });

  it("forwards RSC 'render' errors", async () => {
    installClient();
    await onRequestError(new Error("render boom"), fakeRequest, {
      routerKind: "App Router",
      routePath: "/posts/[slug]",
      routeType: "render",
    });
    expect((payloads[0]?.context.nextjs as Record<string, unknown>).type).toBe("render");
  });

  it("forwards Server Action 'action' errors", async () => {
    installClient();
    await onRequestError(new Error("action boom"), fakeRequest, {
      routerKind: "App Router",
      routePath: "/form",
      routeType: "action",
    });
    expect((payloads[0]?.context.nextjs as Record<string, unknown>).type).toBe("action");
  });

  it("forwards middleware errors", async () => {
    installClient();
    await onRequestError(new Error("middleware boom"), fakeRequest, {
      routerKind: "App Router",
      routePath: "/",
      routeType: "middleware",
    });
    expect((payloads[0]?.context.nextjs as Record<string, unknown>).type).toBe("middleware");
  });
});
