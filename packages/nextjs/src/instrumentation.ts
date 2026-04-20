import { configureServer, getServerClient } from "./singleton.js";

/**
 * Re-export with the exact names Next.js 15 expects when a user writes:
 *
 *   // instrumentation.ts
 *   export { register, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation";
 *
 * `register()` is called once at boot. `onRequestError` is called on
 * every server-side error that Next.js catches (RSC, Route Handler,
 * Server Action, Middleware).
 */
export function register(): void {
  configureServer();
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
 * side error leaks. We forward it into the singleton client with the
 * route info attached as extra context.
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
