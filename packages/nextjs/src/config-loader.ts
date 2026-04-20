import type { ClientConfig } from "@oopsie-exceptions/core";

export type OopsieServerConfigModule = { default: ClientConfig } | { config: ClientConfig };
export type OopsieClientConfigModule = OopsieServerConfigModule;

/**
 * If present, `oopsie.server.config.ts` (or `.js`) at the project
 * root exports a ClientConfig that overrides env-var bootstrap.
 *
 * Sentry-style convention. Implementations of the loader live in
 * user-space (Next.js doesn't give us a file-system escape hatch at
 * runtime), so this file just defines the shape + a helper that
 * validates whatever the user passes in.
 */
export function extractConfig(mod: OopsieServerConfigModule): ClientConfig {
  if ("default" in mod && mod.default) return mod.default;
  if ("config" in mod && mod.config) return mod.config;
  throw new Error(
    "@oopsie-exceptions/nextjs: config module must export `default` or `config`",
  );
}
