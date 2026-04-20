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
    hostname: safeHostname(),
    pid: null,
    ruby_version: null,
    node_version: null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    url: window.location?.href ?? null,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

function safeHostname(): string | null {
  try {
    return window.location?.hostname ?? null;
  } catch {
    return null;
  }
}
