import { getServerClient } from "./singleton-server.js";

/**
 * Wrap a Server Action so thrown errors are reported to Oopsie, then
 * re-thrown so Next.js's normal error UI still fires. Preserves the
 * original fn signature and return value.
 *
 * Talks to the server singleton directly — this file is only ever
 * executed on the server (Server Actions are server-side by
 * definition), so there's no browser-bundle exposure to worry about.
 */
export function wrapServerAction<A extends unknown[], R>(
  fn: (...args: A) => R | Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err) {
      const client = getServerClient();
      if (client) await client.captureException(err, { handled: false });
      throw err;
    }
  };
}
