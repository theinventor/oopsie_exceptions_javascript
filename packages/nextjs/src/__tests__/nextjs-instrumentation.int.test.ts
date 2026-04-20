/**
 * Integration: Next.js-style onRequestError invocation end-to-end
 * with a mocked HTTP collector (real NodeTransport, real server).
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { onRequestError } from "../instrumentation.js";
import { configureServer, resetForTests } from "../singleton.js";
import { NodeTransport } from "@oopsie-exceptions/node";

let server: Server;
let port: number;
const received: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(200);
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

beforeEach(() => {
  received.length = 0;
  resetForTests();
});

describe("integration: nextjs onRequestError end-to-end", () => {
  it("POSTs a real payload with route + request context", async () => {
    configureServer({
      appName: "NextApp",
      environment: "test",
      webhooks: [{ url: `http://127.0.0.1:${port}/webhook`, name: "int" }],
      transport: new NodeTransport(),
      asyncDelivery: false,
    });

    await onRequestError(
      new Error("route boom"),
      {
        path: "/api/posts",
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      {
        routerKind: "App Router",
        routePath: "/api/posts",
        routeType: "route",
      },
    );

    expect(received).toHaveLength(1);
    const body = JSON.parse(received[0] ?? "{}");
    expect(body.notifier).toBe("OopsieExceptions");
    expect(body.error.message).toBe("route boom");
    expect(body.context.nextjs.route).toBe("/api/posts");
    expect(body.context.nextjs.type).toBe("route");
  });
});
