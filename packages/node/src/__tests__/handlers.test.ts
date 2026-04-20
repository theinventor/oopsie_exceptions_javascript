import { OopsieClient, type Transport } from "@oopsie-exceptions/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installGlobalHandlers, uninstallGlobalHandlers } from "../handlers.js";

function makeClient() {
  const sends: unknown[] = [];
  const transport: Transport = {
    send: async (_, payload) => {
      sends.push(payload);
    },
  };
  const client = new OopsieClient({
    appName: "t",
    environment: "test",
    webhooks: [{ url: "https://x.com" }],
    transport,
    asyncDelivery: false,
  });
  return { client, sends };
}

// Note: invoke listeners directly rather than process.emit() — a real
// emit with no remaining handlers triggers Node's default abort/print
// behavior which Vitest captures as a test-runner error even though the
// assertion passed.
function getListeners(event: "uncaughtException"): NodeJS.UncaughtExceptionListener[];
function getListeners(event: "unhandledRejection"): NodeJS.UnhandledRejectionListener[];
function getListeners(event: "uncaughtException" | "unhandledRejection") {
  if (event === "uncaughtException") return process.listeners("uncaughtException");
  return process.listeners("unhandledRejection");
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("installGlobalHandlers", () => {
  it("registers uncaughtException and unhandledRejection listeners", () => {
    const before = getListeners("uncaughtException").length;
    const beforeR = getListeners("unhandledRejection").length;
    const { client } = makeClient();
    cleanups.push(installGlobalHandlers(client));
    expect(getListeners("uncaughtException").length).toBe(before + 1);
    expect(getListeners("unhandledRejection").length).toBe(beforeR + 1);
  });

  it("forwards uncaughtException errors into client.captureException", async () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));

    const listener = getListeners("uncaughtException").at(-1) as (
      err: Error,
      origin: string,
    ) => void;
    listener(new Error("boom"), "uncaughtException");

    expect(spy).toHaveBeenCalledOnce();
    expect((spy.mock.calls[0]?.[0] as Error).message).toBe("boom");
    expect(spy.mock.calls[0]?.[1]).toEqual({ handled: false });
  });

  it("forwards unhandledRejection Error reasons as-is", () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));
    const listener = getListeners("unhandledRejection").at(-1) as (
      reason: unknown,
      promise: Promise<unknown>,
    ) => void;
    const err = new Error("async boom");
    listener(err, Promise.resolve());
    expect(spy.mock.calls[0]?.[0]).toBe(err);
  });

  it("wraps non-Error rejection reasons into an Error", () => {
    const { client } = makeClient();
    const spy = vi.spyOn(client, "captureException").mockResolvedValue();
    cleanups.push(installGlobalHandlers(client));
    const listener = getListeners("unhandledRejection").at(-1) as (
      reason: unknown,
      promise: Promise<unknown>,
    ) => void;
    listener("literal reason", Promise.resolve());
    expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((spy.mock.calls[0]?.[0] as Error).message).toBe("literal reason");
  });

  it("is idempotent — double install does not add a second listener", () => {
    const before = getListeners("uncaughtException").length;
    const { client } = makeClient();
    cleanups.push(installGlobalHandlers(client));
    cleanups.push(installGlobalHandlers(client));
    expect(getListeners("uncaughtException").length).toBe(before + 1);
  });

  it("uninstall removes both listeners", () => {
    const beforeU = getListeners("uncaughtException").length;
    const beforeR = getListeners("unhandledRejection").length;
    const { client } = makeClient();
    const uninstall = installGlobalHandlers(client);
    expect(getListeners("uncaughtException").length).toBe(beforeU + 1);
    uninstall();
    expect(getListeners("uncaughtException").length).toBe(beforeU);
    expect(getListeners("unhandledRejection").length).toBe(beforeR);
  });

  it("uninstallGlobalHandlers helper also works", () => {
    const beforeU = getListeners("uncaughtException").length;
    const { client } = makeClient();
    installGlobalHandlers(client);
    uninstallGlobalHandlers(client);
    expect(getListeners("uncaughtException").length).toBe(beforeU);
  });
});
