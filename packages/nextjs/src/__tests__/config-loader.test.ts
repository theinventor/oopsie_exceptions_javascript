import type { ClientConfig } from "@oopsie-exceptions/core";
import { describe, expect, it } from "vitest";
import { extractConfig } from "../config-loader.js";

const sampleConfig: ClientConfig = {
  appName: "Sample",
  environment: "production",
  webhooks: [{ url: "https://x.com" }],
};

describe("extractConfig", () => {
  it("unwraps a default export", () => {
    expect(extractConfig({ default: sampleConfig })).toBe(sampleConfig);
  });

  it("unwraps a named 'config' export", () => {
    expect(extractConfig({ config: sampleConfig })).toBe(sampleConfig);
  });

  it("throws when neither default nor config is present", () => {
    expect(() => extractConfig({} as never)).toThrow(/must export `default` or `config`/);
  });
});
