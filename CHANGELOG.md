# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - unreleased

### Added
- Initial release of the `@oopsie-exceptions/*` monorepo.
- `@oopsie-exceptions/core` — runtime-agnostic client, payload builder, filters,
  transport interface, context store.
- `@oopsie-exceptions/node` — Node runtime with fetch transport,
  `uncaughtException`/`unhandledRejection` handlers, `AsyncLocalStorage` context.
- `@oopsie-exceptions/browser` — browser runtime with fetch (keepalive) transport,
  `window.onerror` + `unhandledrejection` handlers.
- `@oopsie-exceptions/nextjs` — Next.js App Router bindings:
  `instrumentation.ts` hooks, `<OopsieClient />`, `GlobalErrorReporter`,
  `wrapServerAction`, `wrapRouteHandler`.
- Payload parity with the `oopsie_exceptions` Ruby gem for shared fields.
