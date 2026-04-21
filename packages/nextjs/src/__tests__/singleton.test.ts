import { afterEach, describe, expect, it } from "vitest";
import { configureServer, getServerClient, resetServerForTests } from "../singleton-server.js";
import { configureClient, getClientSideClient, resetClientSideForTests } from "../singleton.js";

afterEach(() => {
  resetClientSideForTests();
  resetServerForTests();
});

describe("configureServer / getServerClient", () => {
  it("returns null before init", () => {
    expect(getServerClient()).toBeNull();
  });

  it("stores the configured client and returns it from getServerClient", () => {
    const client = configureServer({
      appName: "Explicit",
      environment: "test",
      webhooks: [{ url: "https://explicit.com" }],
    });
    expect(getServerClient()).toBe(client);
    expect(client.config.appName).toBe("Explicit");
  });

  it("replaces the singleton when called again", () => {
    const a = configureServer({
      appName: "A",
      environment: "test",
      webhooks: [{ url: "https://a.com" }],
    });
    const b = configureServer({
      appName: "B",
      environment: "test",
      webhooks: [{ url: "https://b.com" }],
    });
    expect(a).not.toBe(b);
    expect(getServerClient()).toBe(b);
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
