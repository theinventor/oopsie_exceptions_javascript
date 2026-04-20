import { OopsieClient, type ClientConfig } from "@oopsie-exceptions/core";
import {
  AsyncLocalStorageContextStore,
  NodeTransport,
  nodeServerInfo,
} from "@oopsie-exceptions/node";

let serverClient: OopsieClient | null = null;
let clientSideClient: OopsieClient | null = null;

/**
 * Read env vars and build a sane ClientConfig for server-side use.
 * Used when the app hasn't supplied an explicit config via
 * `oopsie.server.config.ts` or `configure()`.
 */
export function envConfig(): ClientConfig | null {
  const url = process.env.OOPSIE_WEBHOOK_URL;
  if (!url) return null;
  const token = process.env.OOPSIE_TOKEN;
  const config: ClientConfig = {
    appName: process.env.OOPSIE_APP_NAME ?? "app",
    environment: process.env.NODE_ENV ?? "development",
    webhooks: [
      {
        url,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        name: "oopsie",
      },
    ],
    transport: new NodeTransport(),
    contextStore: new AsyncLocalStorageContextStore(),
    serverInfo: nodeServerInfo,
  };
  return config;
}

/**
 * Initialize (or replace) the server-side singleton. Idempotent —
 * subsequent calls with the same config are no-ops; callers pass an
 * explicit config to override, otherwise env vars are used.
 */
export function configureServer(config?: ClientConfig): OopsieClient | null {
  const cfg = config ?? envConfig();
  if (!cfg) {
    serverClient = null;
    return null;
  }
  serverClient = new OopsieClient(cfg);
  return serverClient;
}

export function getServerClient(): OopsieClient | null {
  if (serverClient) return serverClient;
  return configureServer();
}

export function configureClient(config: ClientConfig): OopsieClient {
  clientSideClient = new OopsieClient(config);
  return clientSideClient;
}

export function getClientSideClient(): OopsieClient | null {
  return clientSideClient;
}

/** Test helper — do not use in app code. */
export function resetForTests(): void {
  serverClient = null;
  clientSideClient = null;
}
