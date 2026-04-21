import type { CaptureOptions } from "@oopsie-exceptions/core";
import { configureServer, getServerClient } from "./singleton-server.js";

export { configureServer, getServerClient } from "./singleton-server.js";

/**
 * Server-side manual capture. For client components import
 * `captureException` from `@oopsie-exceptions/nextjs` instead — that
 * one is browser-safe and won't pull `node:*` into your client bundle.
 */
export async function captureException(error: unknown, opts: CaptureOptions = {}): Promise<void> {
  const client = getServerClient();
  if (!client) return;
  return client.captureException(error, opts);
}

interface RequestErrorContext {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware";
  renderSource?: string;
  revalidate?: number | false;
}

interface RequestErrorRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
}

/**
 * Next.js calls this with (err, request, context) whenever a server-
 * side error leaks. Forwards to the server singleton (set up in
 * `instrumentation.ts#register()` via `configureServer(config)`).
 * No-op if no config was registered.
 */
export async function onRequestError(
  err: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContext,
): Promise<void> {
  const client = getServerClient();
  if (!client) return;

  await client.captureException(err, {
    handled: false,
    context: {
      request: {
        url: request.path,
        method: request.method,
        headers: request.headers,
      },
      nextjs: {
        router: context.routerKind,
        route: context.routePath,
        type: context.routeType,
      },
    },
  });
}
