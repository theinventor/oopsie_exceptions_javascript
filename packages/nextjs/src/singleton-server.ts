import { type ClientConfig, OopsieClient } from "@oopsie-exceptions/core";
import {
  AsyncLocalStorageContextStore,
  NodeTransport,
  nodeServerInfo,
} from "@oopsie-exceptions/node";
import { PKG_VERSION } from "./pkg-version.js";

// Server-only singleton + env-config bootstrap. Must not be imported
// from any file that lands in the browser or Edge runtime bundle,
// because @oopsie-exceptions/node transitively references node:os
// and node:async_hooks. Safe to import from:
//   - instrumentation.ts (Node runtime only — Next.js guards this)
//   - capture-exception.ts inside `typeof window === "undefined"` branch
//     (dynamically, so bundlers tree-shake in the browser build)

let serverClient: OopsieClient | null = null;

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
    packageVersion: PKG_VERSION,
  };
  return config;
}

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

/** Test helper — do not use in app code. */
export function resetServerForTests(): void {
  serverClient = null;
}

// Back-compat shim so the test helper still exists with the old name
export { resetServerForTests as resetForTests };
