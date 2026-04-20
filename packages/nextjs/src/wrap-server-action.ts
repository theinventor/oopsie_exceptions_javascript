import { captureException } from "./capture-exception.js";

/**
 * Wrap a Server Action so thrown errors are reported to Oopsie, then
 * re-thrown so Next.js's normal error UI still fires. Preserves the
 * original fn signature, argument identity, and return value.
 */
export function wrapServerAction<A extends unknown[], R>(
  fn: (...args: A) => R | Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err) {
      await captureException(err, { handled: false });
      throw err;
    }
  };
}
