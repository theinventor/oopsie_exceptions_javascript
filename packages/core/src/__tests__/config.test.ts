import { describe, expect, it } from "vitest";
import { DEFAULT_FILTER_HEADERS, DEFAULT_FILTER_PARAMETERS, normalizeConfig } from "../config.js";

describe("normalizeConfig", () => {
  const baseConfig = {
    appName: "TestApp",
    environment: "test",
    webhooks: [{ url: "https://example.com/hook" }],
  };

  it("applies defaults when optional fields are missing", () => {
    const cfg = normalizeConfig(baseConfig);
    expect(cfg.enabled).toBe(true);
    expect(cfg.asyncDelivery).toBe(true);
    expect(cfg.timeoutMs).toBe(10_000);
    expect(cfg.captureRequestBody).toBe(false);
    expect(cfg.filterParameters).toEqual(DEFAULT_FILTER_PARAMETERS);
    expect(cfg.filterHeaders).toEqual(DEFAULT_FILTER_HEADERS);
    expect(cfg.ignoreErrors).toEqual([]);
    expect(cfg.beforeNotify).toBeNull();
  });

  it("uses webhook.url as the default name", () => {
    const cfg = normalizeConfig(baseConfig);
    expect(cfg.webhooks[0]?.name).toBe("https://example.com/hook");
  });

  it("preserves explicit webhook name and headers", () => {
    const cfg = normalizeConfig({
      ...baseConfig,
      webhooks: [{ url: "https://x.com", name: "primary", headers: { Authorization: "Bearer X" } }],
    });
    expect(cfg.webhooks[0]?.name).toBe("primary");
    expect(cfg.webhooks[0]?.headers).toEqual({ Authorization: "Bearer X" });
  });

  it("throws when appName is missing", () => {
    expect(() => normalizeConfig({ ...baseConfig, appName: "" })).toThrow(/appName/);
  });

  it("throws when environment is missing", () => {
    expect(() => normalizeConfig({ ...baseConfig, environment: "" })).toThrow(/environment/);
  });

  it("throws when webhooks is not an array", () => {
    expect(() =>
      // @ts-expect-error deliberately wrong
      normalizeConfig({ ...baseConfig, webhooks: "nope" }),
    ).toThrow(/webhooks/);
  });

  it("throws when a webhook is missing url", () => {
    expect(() =>
      // @ts-expect-error deliberately wrong
      normalizeConfig({ ...baseConfig, webhooks: [{}] }),
    ).toThrow(/webhooks\[0\].url/);
  });

  it("throws when config is not an object", () => {
    // @ts-expect-error deliberately wrong
    expect(() => normalizeConfig(null)).toThrow(/config/);
  });
});
