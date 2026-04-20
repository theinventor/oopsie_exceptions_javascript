import type { OopsieServerInfo } from "@oopsie-exceptions/core";

/**
 * SSR-safe: returns sensible nulls when `window` is undefined (e.g.
 * during Next.js server rendering).
 */
export function browserServerInfo(): OopsieServerInfo {
  if (typeof window === "undefined") {
    return {
      hostname: null,
      pid: null,
      ruby_version: null,
      node_version: null,
      user_agent: null,
      url: null,
    };
  }
  return {
    hostname: safeGet(() => window.location?.hostname),
    pid: null,
    ruby_version: null,
    node_version: null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    url: safeGet(() => window.location?.href),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

function safeGet<T>(fn: () => T | undefined): T | null {
  try {
    return fn() ?? null;
  } catch {
    return null;
  }
}
