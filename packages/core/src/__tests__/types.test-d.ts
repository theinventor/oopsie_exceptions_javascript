import { describe, expectTypeOf, it } from "vitest";
import { OopsieClient } from "../client.js";
import type {
  CaptureOptions,
  ClientConfig,
  OopsiePayload,
  Plugin,
  Transport,
  Webhook,
} from "../types.js";

describe("public types", () => {
  it("OopsieClient.captureException accepts CaptureOptions", () => {
    const client = new OopsieClient({
      appName: "a",
      environment: "e",
      webhooks: [{ url: "https://x.com" }],
    });
    expectTypeOf(client.captureException).parameter(0).toEqualTypeOf<unknown>();
    expectTypeOf(client.captureException).parameter(1).toEqualTypeOf<CaptureOptions | undefined>();
  });

  it("Webhook type has required url and optional headers/name", () => {
    const w: Webhook = { url: "https://x.com" };
    expectTypeOf(w).toMatchTypeOf<Webhook>();
    expectTypeOf<Webhook["url"]>().toEqualTypeOf<string>();
    expectTypeOf<Webhook["headers"]>().toEqualTypeOf<Record<string, string> | undefined>();
  });

  it("OopsiePayload has the frozen Ruby-parity shape", () => {
    expectTypeOf<OopsiePayload["notifier"]>().toEqualTypeOf<"OopsieExceptions">();
    expectTypeOf<OopsiePayload["error"]["handled"]>().toEqualTypeOf<boolean>();
    expectTypeOf<OopsiePayload["server"]["ruby_version"]>().toEqualTypeOf<null>();
  });

  it("ClientConfig.beforeNotify allows sync or async return", () => {
    const sync: ClientConfig["beforeNotify"] = (p) => p;
    const async: ClientConfig["beforeNotify"] = async (p) => p;
    const drop: ClientConfig["beforeNotify"] = () => null;
    expectTypeOf(sync).not.toBeNever();
    expectTypeOf(async).not.toBeNever();
    expectTypeOf(drop).not.toBeNever();
  });

  it("Plugin receives config + captureException", () => {
    const plugin: Plugin = (api) => {
      expectTypeOf(api.config.appName).toEqualTypeOf<string>();
      expectTypeOf(api.captureException).toBeFunction();
    };
    expectTypeOf(plugin).toBeFunction();
  });

  it("Transport.send signature is correct", () => {
    expectTypeOf<Transport["send"]>().parameter(0).toEqualTypeOf<Webhook>();
    expectTypeOf<Transport["send"]>().returns.toEqualTypeOf<Promise<void>>();
  });
});
