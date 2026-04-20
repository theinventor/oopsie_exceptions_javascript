import { InMemoryContextStore } from "./context.js";
import { NoopTransport } from "./transport.js";
import type { ClientConfig, Logger, NormalizedConfig, OopsieServerInfo, Webhook } from "./types.js";

export const DEFAULT_FILTER_PARAMETERS: (string | RegExp)[] = [
  "password",
  "password_confirmation",
  "secret",
  "token",
  "api_key",
];

export const DEFAULT_FILTER_HEADERS: (string | RegExp)[] = [
  "authorization",
  "cookie",
  "set-cookie",
];

const defaultLogger: Logger = {
  warn: (msg, meta) => {
    console.warn(`[oopsie-exceptions] ${msg}`, meta ?? "");
  },
  error: (msg, meta) => {
    console.error(`[oopsie-exceptions] ${msg}`, meta ?? "");
  },
};

const defaultServerInfo = (): OopsieServerInfo => ({
  hostname: null,
  pid: null,
  ruby_version: null,
});

export function normalizeConfig(raw: ClientConfig): NormalizedConfig {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("OopsieClient: config must be an object");
  }
  if (!raw.appName || typeof raw.appName !== "string") {
    throw new TypeError("OopsieClient: config.appName is required");
  }
  if (!raw.environment || typeof raw.environment !== "string") {
    throw new TypeError("OopsieClient: config.environment is required");
  }
  if (!Array.isArray(raw.webhooks)) {
    throw new TypeError("OopsieClient: config.webhooks must be an array");
  }

  const webhooks: Webhook[] = raw.webhooks.map((w, i) => {
    if (!w || typeof w !== "object") {
      throw new TypeError(`OopsieClient: webhooks[${i}] must be an object`);
    }
    if (!w.url || typeof w.url !== "string") {
      throw new TypeError(`OopsieClient: webhooks[${i}].url is required`);
    }
    return {
      url: w.url,
      headers: w.headers ?? {},
      name: w.name ?? w.url,
    };
  });

  return {
    appName: raw.appName,
    environment: raw.environment,
    webhooks,
    enabled: raw.enabled ?? true,
    asyncDelivery: raw.asyncDelivery ?? true,
    timeoutMs: raw.timeoutMs ?? 10_000,
    filterParameters: raw.filterParameters ?? DEFAULT_FILTER_PARAMETERS,
    filterHeaders: raw.filterHeaders ?? DEFAULT_FILTER_HEADERS,
    captureRequestBody: raw.captureRequestBody ?? false,
    ignoreErrors: raw.ignoreErrors ?? [],
    beforeNotify: raw.beforeNotify ?? null,
    transport: raw.transport ?? new NoopTransport(),
    contextStore: raw.contextStore ?? new InMemoryContextStore(),
    serverInfo: raw.serverInfo ?? defaultServerInfo,
    logger: raw.logger ?? defaultLogger,
    packageVersion: raw.packageVersion ?? "0.0.0",
  };
}

export { defaultLogger, defaultServerInfo };
