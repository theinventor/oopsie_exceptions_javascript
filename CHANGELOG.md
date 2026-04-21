# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - unreleased

Second pass at Turbopack compatibility (after 0.1.1 / 0.1.2 were both still broken).

### Fixed
- **`@oopsie-exceptions/node/server-info`**: removed `node:os` dependency entirely. The v0.1.1 computed `import(spec)` fix didn't hide from Turbopack — it errored with `Module not found: Can't resolve <dynamic>`. The `Function('return require')` fallback didn't work in ESM Node (no `require` in scope). Hostname now comes exclusively from `process.env.HOSTNAME`, which is set on Docker, Kubernetes, Fly.io, Railway, Render, Vercel, and every major Linux shell. Local dev without the env var gets `hostname: null` (the rest of the payload is unaffected). Users wanting a guaranteed real hostname can supply their own `serverInfo` that imports `node:os` directly from a pure-Node app context.
- **`@oopsie-exceptions/nextjs/wrap-server-action` + `/wrap-route-handler`**: now call `getServerClient` directly instead of going through the universal `captureException`. Turbopack was eagerly tracing the `await import("./singleton-server.js")` inside capture-exception and pulling the entire Node-runtime module graph (including `node:async_hooks`) into the client bundle, erroring with `the chunking context does not support external modules (request: node:async_hooks)`. Wrappers only ever execute on the server, so the direct-import version is equivalent behaviour with no browser-bundle bleed.
- **`@oopsie-exceptions/nextjs` main entry `captureException`**: now browser-only (no-op on the server). For server-side manual capture, import `captureException` from `@oopsie-exceptions/nextjs/instrumentation` instead. Keeps the main entry free of any Node-runtime references so client components can safely import wrappers + types.

### Added
- `captureException` export on `@oopsie-exceptions/nextjs/instrumentation` for explicit server-side manual capture.

## [0.1.2] - unreleased

### Fixed
- **Turbopack browser-bundle error** in `@oopsie-exceptions/nextjs`. The `<OopsieClient />` React component imported `configureClient` from `singleton.ts`, which in turn imported from `@oopsie-exceptions/node`, which references `node:async_hooks`. Turbopack can't bundle `node:*` modules for the browser runtime — build failed with `the chunking context does not support external modules (request: node:async_hooks)`.
- Split `singleton.ts` (browser-safe; `configureClient` / `getClientSideClient` only) from a new `singleton-server.ts` (server-only; `configureServer` / `getServerClient` / `envConfig` with `@oopsie-exceptions/node` imports). `capture-exception.ts` now dynamically imports the server singleton only inside the `typeof window === "undefined"` branch.
- Moved `configureServer` / `getServerClient` / `envConfig` re-exports from the main `@oopsie-exceptions/nextjs` entry to `@oopsie-exceptions/nextjs/instrumentation`. Main entry is now fully browser-safe.

### Changed
- Test helper renamed: `resetForTests` split into `resetClientSideForTests` (`singleton.js`) and `resetServerForTests` (`singleton-server.js`). The old `resetForTests` name remains re-exported from `singleton-server.js` as a back-compat alias.

## [0.1.1] - unreleased

### Fixed
- **Edge-runtime compile error** in `@oopsie-exceptions/node`. `server-info.ts` imported `node:os` at the top level, which broke Next.js Edge-runtime compilation of `instrumentation.ts` with `Failed to load external module node:os`. Hostname resolution now uses a runtime-computed dynamic import so bundlers can't follow it statically; in Edge, the import fails silently and `hostname` degrades to `null`. Node runtime behaviour unchanged.

## [0.1.0] - unreleased

First release. JavaScript/Next.js port of the [`oopsie_exceptions`](https://github.com/theinventor/oopsie_exceptions) Ruby gem. The webhook payload shape matches the Ruby gem exactly on shared fields so a single Oopsie collector can receive exceptions from both runtimes.

### Added

#### `@oopsie-exceptions/core`
- `OopsieClient` — runtime-agnostic capture API: `captureException`, `setContext`, `mergeContext`, `clearContext`, `withContext`, `use(plugin)`.
- Payload builder matching the Ruby gem's `Payload.build` output: `notifier`, `version`, `timestamp`, `app`, `error` (`class_name`, `message`, `backtrace`, `first_line`, `causes`, `handled`), `context`, `server`.
- Filters: deep redaction with `[FILTERED]` sentinel, Ruby-parity substring-include matching, header case-insensitive full-name match, circular-ref safe.
- Backtrace parser wraps `error-stack-parser`, walks `error.cause` chain (max depth 10, messages truncated to 1000 chars).
- Transport interface with `sendAll()` fan-out that isolates per-webhook failures — one broken webhook doesn't block the others.
- In-memory `ContextStore`; `beforeNotify` hook supports sync/async and null-to-drop; `ignoreErrors` supports string / RegExp / function matchers; `asyncDelivery` fire-and-forget vs inline await; master `enabled` kill switch.

#### `@oopsie-exceptions/node`
- `NodeTransport` — global-fetch POST with `Content-Type: application/json`, `User-Agent: OopsieExceptions/<version>`, webhook header passthrough (Bearer tokens), timeout via `AbortSignal`.
- `AsyncLocalStorageContextStore` — request-scoped context using `node:async_hooks`, no bleed between concurrent requests.
- `installGlobalHandlers(client)` — idempotent `uncaughtException` + `unhandledRejection` wiring with an uninstall function.
- `nodeServerInfo` — hostname, pid, `process.version`, `ruby_version: null` for parity.

#### `@oopsie-exceptions/browser`
- `BrowserTransport` — fetch with `keepalive: true` so reports survive page unload; same-origin credentials.
- `installGlobalHandlers(client)` — `window.onerror` + `unhandledrejection` listeners, 1-second dedupe window with bounded-size recent-keys map, SSR-safe guard.
- `browserServerInfo` — hostname, `user_agent`, `url`, viewport dimensions; SSR-safe when `window` is undefined.

#### `@oopsie-exceptions/nextjs`
- Next.js 15+ App Router bindings with subpath exports: `.`, `./instrumentation`, `./client`, `./global-error`.
- `instrumentation.ts` — `register()` + `onRequestError(err, req, ctx)` forwarding with `nextjs.router` / `route` / `type` and full request context.
- `<OopsieClient />` — client component that mounts the browser singleton and installs window handlers; warns if `webhookUrl` is missing.
- `<GlobalErrorReporter />` — drop-in for `app/global-error.tsx`; reports on mount exactly once per error identity; passes `error.digest` as context; supports default UI, custom element, or function children.
- `wrapServerAction(fn)` / `wrapRouteHandler(handler)` — capture + rethrow wrappers preserving args and return values.
- Env-var bootstrap: `OOPSIE_WEBHOOK_URL`, `OOPSIE_TOKEN`, `OOPSIE_APP_NAME`.
- Sentry-style `oopsie.server.config.ts` / `oopsie.client.config.ts` via `extractConfig(mod)`.
