import type { OopsieServerInfo } from "@oopsie-exceptions/core";

/**
 * Edge-runtime safety: importing `node:os` at the top level breaks
 * Next.js Edge-runtime compilation (instrumentation.ts is built for
 * BOTH runtimes). Resolve it lazily through a runtime-computed
 * specifier so bundlers can't follow the import statically; the
 * Edge bundle omits node:os entirely and hostname gracefully
 * degrades to null.
 */
let cachedHostname: string | null | undefined;
let hostnameProbeStarted = false;

function probeHostname(): void {
  if (hostnameProbeStarted) return;
  hostnameProbeStarted = true;
  // Hide spec from static analysis — webpack/turbopack can't follow
  // dynamic imports where the spec is computed at runtime.
  const spec = ["node", "os"].join(":");
  import(/* @vite-ignore */ spec)
    .then((os: { hostname: () => string }) => {
      cachedHostname = os.hostname();
    })
    .catch(() => {
      cachedHostname = null;
    });
}

export function nodeServerInfo(): OopsieServerInfo {
  probeHostname();
  return {
    hostname: cachedHostname ?? null,
    pid: typeof process !== "undefined" ? process.pid : null,
    ruby_version: null,
    node_version: typeof process !== "undefined" ? process.version : null,
  };
}

/** Test helper — resolves once the first hostname probe completes. */
export async function __hostnameReadyForTests(): Promise<void> {
  probeHostname();
  // Let the microtask queue drain
  await Promise.resolve();
  await Promise.resolve();
}
