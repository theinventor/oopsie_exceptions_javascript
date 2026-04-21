import { type ClientConfig, OopsieClient } from "@oopsie-exceptions/core";

// Browser-safe singleton state. Deliberately does NOT import from
// @oopsie-exceptions/node — that package references node:os and
// node:async_hooks, which Turbopack can't bundle for the browser /
// Edge runtimes. The server-side counterpart lives in
// `singleton-server.ts` and is only imported from server-only files
// (instrumentation.ts, capture-exception.ts server branch).

let clientSideClient: OopsieClient | null = null;

export function configureClient(config: ClientConfig): OopsieClient {
  clientSideClient = new OopsieClient(config);
  return clientSideClient;
}

export function getClientSideClient(): OopsieClient | null {
  return clientSideClient;
}

/** Test helper — do not use in app code. */
export function resetClientSideForTests(): void {
  clientSideClient = null;
}
