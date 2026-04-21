import type { OopsieServerInfo } from "@oopsie-exceptions/core";

/**
 * Resolve hostname without referencing `node:os` anywhere in the
 * module graph — even as a dynamic/eval'd import, Turbopack and
 * friends reject it.
 *
 * In practice the HOSTNAME env var is set on virtually every real
 * deployment target:
 *   - Docker, Kubernetes, Fly.io, Railway, Render — set by the runtime
 *   - Vercel — `process.env.HOSTNAME` populated for serverless/edge
 *   - Linux shells — `$HOSTNAME` is exported by bash/zsh
 *   - Local dev on macOS without explicit env — null, which is fine;
 *     the error report still has pid + node_version + app + context
 *
 * If you need a guaranteed real hostname, supply your own serverInfo:
 *
 *   import { hostname } from "node:os"; // only safe in pure-Node apps
 *   new OopsieClient({ serverInfo: () => ({ hostname: hostname(), ... }) })
 */
function resolveHostname(): string | null {
  if (typeof process !== "undefined" && typeof process.env?.HOSTNAME === "string") {
    return process.env.HOSTNAME;
  }
  return null;
}

let cachedHostname: string | null | undefined;

export function nodeServerInfo(): OopsieServerInfo {
  if (cachedHostname === undefined) cachedHostname = resolveHostname();
  return {
    hostname: cachedHostname,
    pid: typeof process !== "undefined" ? process.pid : null,
    ruby_version: null,
    node_version: typeof process !== "undefined" ? process.version : null,
  };
}

/** Test helper — clears the memoized hostname. */
export function __resetHostnameCacheForTests(): void {
  cachedHostname = undefined;
}
