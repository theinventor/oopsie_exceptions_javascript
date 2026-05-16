import type { OopsieClient } from "@oopsie-exceptions/core";

interface InstalledHandlers {
  onError: (event: ErrorEvent) => void;
  onRejection: (event: PromiseRejectionEvent) => void;
  recent: Map<string, number>;
}

const DEDUPE_WINDOW_MS = 1000;
const INSTALLED = new WeakMap<object, InstalledHandlers>();

/**
 * Install window.onerror + unhandledrejection listeners and forward
 * them to client.captureException. Dedupes identical errors fired
 * within DEDUPE_WINDOW_MS (1 second) — browsers sometimes emit the
 * same uncaught error twice. Idempotent per client.
 */
export function installGlobalHandlers(client: OopsieClient): () => void {
  if (typeof window === "undefined") {
    throw new Error(
      "@oopsie-exceptions/browser: installGlobalHandlers requires a browser environment",
    );
  }
  if (INSTALLED.has(client)) {
    return () => uninstall(client);
  }

  const recent = new Map<string, number>();

  const dedupeKey = (err: unknown, extra = ""): string => {
    if (err instanceof Error) return `${err.name}:${err.message}:${extra}`;
    if (typeof err === "string") return `str:${err}:${extra}`;
    try {
      return `obj:${JSON.stringify(err)}:${extra}`;
    } catch {
      return `obj:<unserializable>:${extra}`;
    }
  };

  const isDuplicate = (key: string): boolean => {
    const now = Date.now();
    const last = recent.get(key);
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return true;
    recent.set(key, now);
    if (recent.size > 50) {
      const oldest = [...recent.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
      if (oldest !== undefined) recent.delete(oldest);
    }
    return false;
  };

  const onError = (event: ErrorEvent) => {
    const err =
      event.error instanceof Error
        ? event.error
        : new Error(event.message || "unknown window error");
    const key = dedupeKey(err, `${event.filename}:${event.lineno}:${event.colno}`);
    if (isDuplicate(key)) return;
    void client.captureException(err, { handled: false });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : new Error(String(reason));
    const key = dedupeKey(reason);
    if (isDuplicate(key)) return;
    void client.captureException(err, { handled: false });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  INSTALLED.set(client, { onError, onRejection, recent });

  return () => uninstall(client);
}

function uninstall(client: OopsieClient): void {
  const entry = INSTALLED.get(client);
  if (!entry) return;
  window.removeEventListener("error", entry.onError);
  window.removeEventListener("unhandledrejection", entry.onRejection);
  INSTALLED.delete(client);
}

export function uninstallGlobalHandlers(client: OopsieClient): void {
  uninstall(client);
}
