import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configureServer,
  envConfig,
  getServerClient,
  resetServerForTests,
} from "../singleton-server.js";
import { configureClient, getClientSideClient, resetClientSideForTests } from "../singleton.js";

const originalEnv = { ...process.env };

afterEach(() => {
  resetClientSideForTests();
  resetServerForTests();
  process.env = { ...originalEnv };
});

describe("envConfig", () => {
  beforeEach(() => {
    Reflect.deleteProperty(process.env, "OOPSIE_WEBHOOK_URL");
    Reflect.deleteProperty(process.env, "OOPSIE_TOKEN");
    Reflect.deleteProperty(process.env, "OOPSIE_APP_NAME");
  });

  it("returns null when OOPSIE_WEBHOOK_URL is not set", () => {
    expect(envConfig()).toBeNull();
  });

  it("builds a config when OOPSIE_WEBHOOK_URL is set", () => {
    process.env.OOPSIE_WEBHOOK_URL = "https://x.com/hook";
    process.env.OOPSIE_TOKEN = "abc";
    process.env.OOPSIE_APP_NAME = "MyApp";
    const cfg = envConfig();
    expect(cfg).not.toBeNull();
    expect(cfg?.appName).toBe("MyApp");
    expect(cfg?.webhooks[0]?.url).toBe("https://x.com/hook");
    expect(cfg?.webhooks[0]?.headers).toEqual({ Authorization: "Bearer abc" });
  });

  it("omits Authorization header when OOPSIE_TOKEN is not set", () => {
    process.env.OOPSIE_WEBHOOK_URL = "https://x.com/hook";
    const cfg = envConfig();
    expect(cfg?.webhooks[0]?.headers).toEqual({});
  });

  it("defaults appName to 'app'", () => {
    process.env.OOPSIE_WEBHOOK_URL = "https://x.com/hook";
    const cfg = envConfig();
    expect(cfg?.appName).toBe("app");
  });
});

describe("configureServer / getServerClient", () => {
  beforeEach(() => {
    Reflect.deleteProperty(process.env, "OOPSIE_WEBHOOK_URL");
  });

  it("returns null when no config and no env vars", () => {
    expect(configureServer()).toBeNull();
    expect(getServerClient()).toBeNull();
  });

  it("bootstraps from env vars when no explicit config", () => {
    process.env.OOPSIE_WEBHOOK_URL = "https://e.com";
    const client = getServerClient();
    expect(client).not.toBeNull();
    expect(client?.config.appName).toBe("app");
  });

  it("accepts an explicit config that overrides env", () => {
    process.env.OOPSIE_WEBHOOK_URL = "https://env.com";
    const client = configureServer({
      appName: "Explicit",
      environment: "test",
      webhooks: [{ url: "https://explicit.com" }],
    });
    expect(client?.config.appName).toBe("Explicit");
    expect(client?.config.webhooks[0]?.url).toBe("https://explicit.com");
  });

  it("getServerClient is memoized — subsequent calls return the same instance", () => {
    process.env.OOPSIE_WEBHOOK_URL = "https://e.com";
    const a = getServerClient();
    const b = getServerClient();
    expect(a).toBe(b);
  });
});

describe("configureClient / getClientSideClient", () => {
  it("returns null before init", () => {
    expect(getClientSideClient()).toBeNull();
  });

  it("returns the configured client after init", () => {
    const client = configureClient({
      appName: "browser",
      environment: "dev",
      webhooks: [{ url: "https://x.com" }],
    });
    expect(getClientSideClient()).toBe(client);
  });
});
