import { captureException } from "./capture-exception.js";

/**
 * Wrap a Route Handler (App Router GET/POST/... export) so thrown
 * errors are reported, then re-thrown so Next's default 500 still
 * fires. Returns the handler's result unchanged on success.
 */
export function wrapRouteHandler<
  A extends [Request, ...unknown[]],
  R extends Response | Promise<Response>,
>(handler: (...args: A) => R): (...args: A) => Promise<Awaited<R>> {
  return async (...args: A): Promise<Awaited<R>> => {
    try {
      return await handler(...args);
    } catch (err) {
      await captureException(err, { handled: false });
      throw err;
    }
  };
}
