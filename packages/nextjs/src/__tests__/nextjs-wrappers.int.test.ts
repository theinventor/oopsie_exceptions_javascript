/**
 * Integration: wrapServerAction + wrapRouteHandler both actually POST
 * to a real mock collector via the real NodeTransport.
 */
import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { NodeTransport } from "@oopsie-exceptions/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configureServer, resetForTests } from "../singleton.js";
import { wrapRouteHandler } from "../wrap-route-handler.js";
import { wrapServerAction } from "../wrap-server-action.js";

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
  configureServer({
    appName: "NextApp",
    environment: "test",
    webhooks: [{ url: `http://127.0.0.1:${port}/webhook` }],
    transport: new NodeTransport(),
    asyncDelivery: false,
  });
});

describe("integration: wrappers end-to-end", () => {
  it("wrapServerAction POSTs on thrown error", async () => {
    const action = wrapServerAction(async () => {
      throw new Error("server-action boom");
    });
    await expect(action()).rejects.toThrow("server-action boom");
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0] ?? "{}").error.message).toBe("server-action boom");
  });

  it("wrapRouteHandler POSTs on thrown error", async () => {
    const handler = wrapRouteHandler(async () => {
      throw new Error("route-handler boom");
    });
    await expect(handler(new Request("https://x.com/"))).rejects.toThrow("route-handler boom");
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0] ?? "{}").error.message).toBe("route-handler boom");
  });

  it("wrappers do NOT POST when the fn succeeds", async () => {
    const action = wrapServerAction(async () => 42);
    expect(await action()).toBe(42);
    expect(received).toHaveLength(0);
  });
});
