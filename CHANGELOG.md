# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
