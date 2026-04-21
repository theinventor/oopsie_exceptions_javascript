import { getServerClient } from "./singleton-server.js";

/**
 * Wrap a Route Handler (App Router GET/POST/... export) so thrown
 * errors are reported, then re-thrown so Next's default 500 still
 * fires. Returns the handler's result unchanged on success.
 *
 * Talks to the server singleton directly — Route Handlers only ever
 * execute on the server.
 */
export function wrapRouteHandler<
  A extends [Request, ...unknown[]],
  R extends Response | Promise<Response>,
>(handler: (...args: A) => R): (...args: A) => Promise<Awaited<R>> {
  return async (...args: A): Promise<Awaited<R>> => {
    try {
      return await handler(...args);
    } catch (err) {
      const client = getServerClient();
      if (client) await client.captureException(err, { handled: false });
      throw err;
    }
  };
}
