import type { CaptureOptions } from "@oopsie-exceptions/core";
import { getClientSideClient } from "./singleton.js";

/**
 * Browser-side `captureException`. This is the default export from
 * `@oopsie-exceptions/nextjs` and is safe to call from any client
 * component. If invoked on the server (e.g. in a Server Component or
 * Server Action), it's a no-op — use `wrapServerAction` /
 * `wrapRouteHandler` / `onRequestError` or import `captureException`
 * from `@oopsie-exceptions/nextjs/instrumentation` for server-side
 * manual capture.
 *
 * Kept free of any dynamic/static imports of @oopsie-exceptions/node
 * so Turbopack's client bundle stays clean of `node:*` specifiers.
 */
export async function captureException(error: unknown, opts: CaptureOptions = {}): Promise<void> {
  if (typeof window === "undefined") return;
  const client = getClientSideClient();
  if (!client) return;
  return client.captureException(error, opts);
}
