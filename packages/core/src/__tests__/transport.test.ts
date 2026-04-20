import { describe, expect, it, vi } from "vitest";
import { NoopTransport, sendAll } from "../transport.js";
import type { Logger, OopsiePayload, Transport, Webhook } from "../types.js";

const fakePayload = (): OopsiePayload => ({
  notifier: "OopsieExceptions",
  version: "0.0.0",
  timestamp: "2026-04-20T00:00:00.000Z",
  app: { name: "t", environment: "test" },
  error: {
    class_name: "Error",
    message: "x",
    backtrace: null,
    first_line: null,
    causes: [],
    handled: false,
  },
  context: {},
  server: { hostname: null, pid: null, ruby_version: null },
});

const makeLogger = () => {
  const entries: { level: string; msg: string; meta: unknown }[] = [];
  const logger: Logger = {
    warn: (msg, meta) => entries.push({ level: "warn", msg, meta }),
    error: (msg, meta) => entries.push({ level: "error", msg, meta }),
  };
  return { logger, entries };
};

describe("NoopTransport", () => {
  it("resolves without side effects", async () => {
    const t = new NoopTransport();
    await expect(
      t.send({ url: "https://x.com" }, fakePayload(), { timeoutMs: 10 }),
    ).resolves.toBeUndefined();
  });
});

describe("sendAll", () => {
  const webhooks: Webhook[] = [
    { url: "https://a.com", name: "a" },
    { url: "https://b.com", name: "b" },
  ];

  it("calls transport.send for every webhook", async () => {
    const send = vi.fn<Transport["send"]>().mockResolvedValue(undefined);
    const transport: Transport = { send };
    const { logger } = makeLogger();
    await sendAll(transport, webhooks, fakePayload(), { timeoutMs: 5000, logger });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(webhooks[0], expect.any(Object), { timeoutMs: 5000 });
    expect(send).toHaveBeenCalledWith(webhooks[1], expect.any(Object), { timeoutMs: 5000 });
  });

  it("isolates failures — one webhook rejecting does not block others", async () => {
    const send = vi
      .fn<Transport["send"]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("b is down"));
    const transport: Transport = { send };
    const { logger, entries } = makeLogger();

    await expect(
      sendAll(transport, webhooks, fakePayload(), { timeoutMs: 5000, logger }),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
    const errorEntry = entries.find((e) => e.level === "error");
    expect(errorEntry?.msg).toContain("delivery to b failed");
  });

  it("logs webhook url if name is missing", async () => {
    const send = vi.fn<Transport["send"]>().mockRejectedValue(new Error("nope"));
    const transport: Transport = { send };
    const { logger, entries } = makeLogger();
    await sendAll(transport, [{ url: "https://unnamed.com" }], fakePayload(), {
      timeoutMs: 1000,
      logger,
    });
    expect(entries[0]?.msg).toContain("https://unnamed.com");
  });
});
