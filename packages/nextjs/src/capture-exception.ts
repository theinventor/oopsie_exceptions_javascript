import type { CaptureOptions } from "@oopsie-exceptions/core";
import { getClientSideClient, getServerClient } from "./singleton.js";

/**
 * Route an exception to whichever client is initialized for this
 * runtime (server singleton if running on the server, client-side
 * singleton if in the browser). No-op if neither is initialized.
 */
export async function captureException(
  error: unknown,
  opts: CaptureOptions = {},
): Promise<void> {
  const isServer = typeof window === "undefined";
  const client = isServer ? getServerClient() : getClientSideClient();
  if (!client) return;
  return client.captureException(error, opts);
}
