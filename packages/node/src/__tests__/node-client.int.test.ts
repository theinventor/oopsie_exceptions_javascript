/**
 * Integration test: real Node HTTP server receives a real POST from
 * a real OopsieClient wired with NodeTransport. Verifies end-to-end
 * delivery for the Node runtime package.
 */
import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { OopsieClient } from "@oopsie-exceptions/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AsyncLocalStorageContextStore } from "../context.js";
import { __hostnameReadyForTests, nodeServerInfo } from "../server-info.js";
import { NodeTransport } from "../transport.js";

interface Received {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let server: Server;
let baseUrl: string;
const received: Received[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push({
        url: req.url ?? "",
        method: req.method ?? "",
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("integration: Node client end-to-end", () => {
  it("POSTs a valid Oopsie payload to a real server", async () => {
    // Let the lazy hostname probe resolve before asserting on it
    await __hostnameReadyForTests();
    await new Promise((r) => setTimeout(r, 10));

    received.length = 0;
    const client = new OopsieClient({
      appName: "IntegrationApp",
      environment: "test",
      webhooks: [
        { url: `${baseUrl}/webhook`, name: "int", headers: { Authorization: "Bearer t" } },
      ],
      transport: new NodeTransport(),
      contextStore: new AsyncLocalStorageContextStore(),
      serverInfo: nodeServerInfo,
      asyncDelivery: false,
      packageVersion: "0.1.0",
    });

    await client.captureException(new Error("real boom"), {
      context: { action: "test#integration" },
    });

    expect(received).toHaveLength(1);
    const hit = received[0];
    expect(hit?.url).toBe("/webhook");
    expect(hit?.method).toBe("POST");
    expect(hit?.headers["content-type"]).toBe("application/json");
    expect(hit?.headers.authorization).toBe("Bearer t");
    const body = JSON.parse(hit?.body ?? "{}");
    expect(body.notifier).toBe("OopsieExceptions");
    expect(body.error.message).toBe("real boom");
    expect(body.context).toEqual({ action: "test#integration" });
    expect(typeof body.server.hostname).toBe("string");
    expect(body.server.node_version).toBe(process.version);
    expect(body.server.ruby_version).toBeNull();
  });
});
