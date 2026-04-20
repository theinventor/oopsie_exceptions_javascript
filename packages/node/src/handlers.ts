import type { OopsieClient } from "@oopsie-exceptions/core";

type UncaughtListener = (err: Error, origin: NodeJS.UncaughtExceptionOrigin) => void;
type UnhandledRejectionListener = (reason: unknown, promise: Promise<unknown>) => void;

interface InstalledHandlers {
  uncaught: UncaughtListener;
  rejection: UnhandledRejectionListener;
}

const INSTALLED = new WeakMap<object, InstalledHandlers>();

/**
 * Attach global error listeners for uncaughtException and
 * unhandledRejection, forwarding both into client.captureException.
 * Idempotent per client. Returns an uninstall function.
 */
export function installGlobalHandlers(client: OopsieClient): () => void {
  if (INSTALLED.has(client)) {
    return () => uninstall(client);
  }

  const uncaught: UncaughtListener = (err) => {
    void client.captureException(err, { handled: false });
  };

  const rejection: UnhandledRejectionListener = (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    void client.captureException(err, { handled: false });
  };

  process.on("uncaughtException", uncaught);
  process.on("unhandledRejection", rejection);

  INSTALLED.set(client, { uncaught, rejection });

  return () => uninstall(client);
}

function uninstall(client: OopsieClient): void {
  const entry = INSTALLED.get(client);
  if (!entry) return;
  process.off("uncaughtException", entry.uncaught);
  process.off("unhandledRejection", entry.rejection);
  INSTALLED.delete(client);
}

export function uninstallGlobalHandlers(client: OopsieClient): void {
  uninstall(client);
}
