import { type ClientConfig, OopsieClient } from "@oopsie-exceptions/core";

// Server-only singleton. Must not be imported from any file that
// lands in the browser or Edge runtime bundle.

let serverClient: OopsieClient | null = null;

/**
 * Register the server-side singleton. Typically called from
 * `instrumentation.ts` with an imported `oopsie.server.config`:
 *
 *   import config from "./oopsie.server.config";
 *   import { configureServer, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation";
 *   export function register() { configureServer(config); }
 *   export { onRequestError };
 *
 * Idempotent — calling again replaces the current singleton.
 */
export function configureServer(config: ClientConfig): OopsieClient {
  serverClient = new OopsieClient(config);
  return serverClient;
}

export function getServerClient(): OopsieClient | null {
  return serverClient;
}

/** Test helper — do not use in app code. */
export function resetServerForTests(): void {
  serverClient = null;
}

// Back-compat alias for pre-0.1.4 tests.
export { resetServerForTests as resetForTests };
