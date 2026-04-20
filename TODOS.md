# TODOS — `oopsie_exceptions_javascript` v0.1

Full task list to build the npm monorepo against `plan.md`. Checkboxes in rough execution order. Sibling tasks within a section can be done in any order unless noted.

---

## Testing strategy (applies to every phase)

- **TDD where cheap**: write the test before the src file for pure-logic modules (payload, filters, backtrace, context, config). Implementation-first is fine for glue code (handlers, Next.js wiring).
- **Every source file gets a companion test** in `src/__tests__/*.test.ts`. No `.ts` lands green without a sibling test except pure type-only files (`types.ts`, `index.ts` re-exports).
- **Snapshot parity fixture**: one canonical Ruby-sourced payload JSON committed to `packages/core/src/__tests__/fixtures/ruby-payload.json`. Core `payload.test.ts` asserts shared-field equality against it. This is the single source of truth for Ruby/JS parity.
- **Coverage gate**: Vitest v8 coverage ≥ 90% lines/branches for `core`; ≥ 80% for `node`, `browser`, `nextjs`. Wire into CI.
- **Unit vs integration vs e2e**:
  - Unit: per-module, mocked boundaries — most tests.
  - Integration: cross-package (core + transport + handlers wired together with mocked `fetch`) — one suite per runtime package.
  - E2E: Phase 7 real Next.js app hitting a real (or mock) collector.
- **CI runs**: lint → typecheck → unit+integration tests → build → pack dry-run, on Node 20 and 22.

---

## Phase 0 — Git & working tree bootstrap

- [x] Reconcile local `main` with `origin/main` (pull the existing `LICENSE` commit)
- [x] Read Ruby gem reference files once, keep open for parity cross-checks:
  - [x] `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/payload.rb`
  - [x] `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/configuration.rb`
  - [x] `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/webhook_client.rb`
  - [x] `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/context.rb`
  - [x] `/Users/troy/projects/oopsie_exceptions/README.md`
- [x] Capture a real Ruby-sourced payload JSON fixture (for snapshot parity tests) — see `reference/ruby-payload.json`

---

## Phase 1 — Root scaffolding

- [x] `.gitignore` (`node_modules/`, `dist/`, `*.log`, `.DS_Store`, `coverage/`, `.turbo/`, `.env*`)
- [x] `.node-version` (pin to Node 22 LTS)
- [x] `.npmrc` (`engine-strict=true`, `access=public`)
- [x] `.npmignore` template (copied into each package; excludes `src/`, tests, tsconfigs) — see `.npmignore.template`
- [x] Root `package.json`:
  - [x] `"private": true`
  - [x] `"workspaces": ["packages/*"]`
  - [x] scripts: `build`, `test`, `typecheck`, `lint`, `format`, `clean`, `release`
  - [x] devDeps: `typescript`, `vitest`, `@biomejs/biome`, `@types/node`
- [x] `tsconfig.base.json` — strict, ES2022, module `NodeNext`, declarations on, source maps, `composite: true`
- [x] `tsconfig.json` — project references to all four packages
- [x] `biome.json` — formatter + linter config
- [x] `vitest.config.ts` — workspace-aware, coverage with v8
- [x] `LICENSE` (MIT, matching Ruby gem author — may already exist on remote)
- [x] `README.md` — port structure from Ruby gem README, swap examples for JS/Next.js
- [x] `CHANGELOG.md` — seed with `## [0.1.0] - unreleased`
- [x] `.github/workflows/ci.yml` — matrix: Node 20 + 22; steps: install, lint, typecheck, test, build, pack dry-run

---

## Phase 2 — `@oopsie-exceptions/core`

Zero runtime deps. Runtime-agnostic. Drives everything else.

### Package skeleton
- [x] `packages/core/package.json` (name, version `0.1.0`, `exports` map, `main`, `module`, `types`, `publishConfig.access: public`, `sideEffects: false`)
- [x] `packages/core/tsconfig.esm.json` → `dist/esm`
- [x] `packages/core/tsconfig.cjs.json` → `dist/cjs`
- [x] `packages/core/.npmignore`
- [x] `packages/core/README.md`

### Source files
- [x] `src/types.ts` — `OopsiePayload`, `OopsieError`, `OopsieContext`, `Webhook`, `ClientConfig`, `BeforeNotifyHook`, `Plugin`
- [x] `src/config.ts` — normalize + validate `ClientConfig`, defaults mirroring Ruby `Configuration`
- [x] `src/filters.ts` — param/header filtering (keys + regex), deep redaction with `[FILTERED]` sentinel
- [x] `src/backtrace.ts` — wrap `error-stack-parser`, normalize to Ruby-style frames, walk `error.cause` chain
- [x] `src/context.ts` — base `ContextStore` interface + in-memory impl; `setContext` / `mergeContext` / `clear`
- [x] `src/transport.ts` — `Transport` interface; `sendAll(webhooks, payload)` fan-out with per-webhook error isolation
- [x] `src/payload.ts` — build the top-level JSON object exactly matching `payload.rb` (notifier, version, timestamp, app, error, context, server)
- [x] `src/client.ts` — `OopsieClient`: `captureException`, `setContext`, `withContext`, `use(plugin)`, `ignoreErrors` check, `beforeNotify` pipeline, `asyncDelivery` semantics
- [x] `src/index.ts` — public re-exports

### Unit tests (`src/__tests__/`) — one per source file
- [x] `fixtures/ruby-payload.json` — canonical Ruby-sourced payload committed as parity reference
- [x] `types.test-d.ts` — `expectTypeOf` assertions on the public types
- [x] `config.test.ts` — defaults, validation errors, env-var overrides, webhook normalization
- [x] `filters.test.ts` — password/token/cookie redaction, regex keys, nested objects, arrays, circular refs
- [x] `backtrace.test.ts` — V8 stacks, Firefox stacks, Safari stacks, `error.cause` chains, anonymous frames
- [x] `context.test.ts` — set/merge/clear semantics match Ruby `Context`; shallow vs deep merge
- [x] `transport.test.ts` — `sendAll` fan-out; one webhook failing doesn't block others; timeout propagation
- [x] `payload.test.ts` — snapshot against `fixtures/ruby-payload.json` for shared fields, including `ruby_version: null` parity
- [x] `client.test.ts` — `captureException`, `ignoreErrors` string + regex, `beforeNotify` drop via `null`, `setContext`, `withContext` scoping, `use(plugin)`, async vs sync delivery, `enabled: false` no-op

### Integration tests
- [x] `client-transport.int.test.ts` — full pipeline: `captureException` → payload build → filters → fan-out, with mocked `fetch`
- [x] `context-propagation.int.test.ts` — `withContext` propagates correctly across nested async boundaries

---

## Phase 3 — `@oopsie-exceptions/node`

### Package skeleton
- [x] `packages/node/package.json` (depends on `core`)
- [x] tsconfigs + `.npmignore` + `README.md`

### Source files
- [x] `src/transport.ts` — `fetch`-based transport with configurable timeout + abort signal
- [x] `src/handlers.ts` — `uncaughtException`, `unhandledRejection` wiring; idempotent install/uninstall
- [x] `src/context.ts` — `AsyncLocalStorage`-backed context store, overrides core's in-memory default
- [x] `src/server-info.ts` — hostname, pid, `process.version` for `server` block
- [x] `src/index.ts`

### Unit tests — one per source file
- [x] `transport.test.ts` — real `fetch` mocked; timeout behavior; header passthrough; bearer token interpolation; non-2xx response handling
- [x] `handlers.test.ts` — `uncaughtException` + `unhandledRejection` registration + teardown; idempotency; multi-install guard
- [x] `context.test.ts` — ALS isolation across concurrent async tasks; `withContext` nesting; leak prevention
- [x] `server-info.test.ts` — hostname, pid, `process.version` present; survives missing hostname

### Integration tests
- [x] `node-client.int.test.ts` — full flow: real handlers triggered with synthetic error → POST received by mock HTTP server

---

## Phase 4 — `@oopsie-exceptions/browser`

### Package skeleton
- [x] `packages/browser/package.json` (depends on `core`)
- [x] tsconfigs + `.npmignore` + `README.md`

### Source files
- [x] `src/transport.ts` — browser `fetch` transport; `keepalive: true` for unload-time delivery
- [x] `src/handlers.ts` — `window.onerror`, `window.addEventListener('unhandledrejection')`; install/uninstall
- [x] `src/server-info.ts` — userAgent, url, viewport sizing for `server` block (JS-specific additions, keep `hostname` null-safe)
- [x] `src/index.ts`

### Unit tests — one per source file (run under `jsdom` / `happy-dom`)
- [x] `transport.test.ts` — mocked fetch; `keepalive` flag set; CORS header handling
- [x] `handlers.test.ts` — synthetic `ErrorEvent` + `PromiseRejectionEvent`; dedupe of repeated errors; teardown
- [x] `server-info.test.ts` — userAgent, url, viewport captured; SSR-safe when `window` undefined

### Integration tests
- [x] `browser-client.int.test.ts` — full flow: handler installed → `window.dispatchEvent` → POST captured via mocked fetch

---

## Phase 5 — `@oopsie-exceptions/nextjs`

Depends on `node` + `browser`. Single package, multiple entry points via `exports` subpaths.

### Package skeleton
- [x] `packages/nextjs/package.json` with subpath exports:
  - [x] `.` (main; re-exports `captureException`, types)
  - [x] `./instrumentation` (server init + `onRequestError`)
  - [x] `./client` (React client component)
  - [x] `./global-error` (`GlobalErrorReporter`)
- [x] `peerDependencies`: `next >= 15`, `react >= 18`
- [x] tsconfigs + `.npmignore` + `README.md`

### Source files
- [x] `src/singleton.ts` — lazy-constructed shared `OopsieClient`; env-var bootstrap (`OOPSIE_WEBHOOK_URL`, `OOPSIE_TOKEN`, `OOPSIE_APP_NAME`)
- [x] `src/instrumentation.ts` — exports `register()` + `onRequestError(err, req, ctx)` → `client.captureException`
- [x] `src/client.tsx` — `<OopsieClient />` mount component; registers browser handlers; exposes `captureException` via context
- [x] `src/global-error.tsx` — `GlobalErrorReporter` component that reports then renders fallback
- [x] `src/wrap-server-action.ts` — `wrapServerAction(fn)` try/catch that captures then rethrows
- [x] `src/wrap-route-handler.ts` — `wrapRouteHandler(handler)` same pattern for Route Handlers
- [x] `src/capture-exception.ts` — thin re-export bound to singleton
- [x] `src/config-loader.ts` — optional `oopsie.server.config.ts` / `oopsie.client.config.ts` loader
- [x] `src/index.ts`

### Unit tests — one per source file
- [x] `singleton.test.ts` — env-var bootstrap, idempotent init, reset between tests
- [x] `instrumentation.test.ts` — `onRequestError` payload shape for RSC / Route Handler / Server Action / middleware `context.routerKind`
- [x] `client.test.tsx` — `<OopsieClient />` mounts, installs browser handlers, unmounts cleanly (react testing library)
- [x] `global-error.test.tsx` — `GlobalErrorReporter` reports on mount exactly once, renders fallback, passes `reset` through
- [x] `wrap-server-action.test.ts` — captures + rethrows; preserves return value on success; passes args through
- [x] `wrap-route-handler.test.ts` — same contract as server-action wrapper; `Request` / `Response` passthrough
- [x] `capture-exception.test.ts` — routes to singleton; no-op when client not initialized
- [x] `config-loader.test.ts` — loads `oopsie.server.config.ts` / `oopsie.client.config.ts` when present; falls back to env vars

### Integration tests
- [x] `nextjs-instrumentation.int.test.ts` — simulate Next.js `onRequestError` invocation end-to-end with mocked collector
- [x] `nextjs-wrappers.int.test.ts` — `wrapServerAction` + `wrapRouteHandler` actually POST to mocked collector

---

## Phase 6 — Build & type verification

- [ ] `npm install` at root resolves all workspaces
- [ ] `npm run typecheck` clean across all packages (strict mode)
- [ ] `npm run build` produces `dist/esm` + `dist/cjs` + `.d.ts` for all four packages
- [ ] `npm run test` — all Vitest suites green (unit + integration)
- [ ] `npm run test -- --coverage` — meets per-package coverage gates (core ≥ 90%, others ≥ 80%)
- [ ] `npm run lint` / `npm run format` clean via Biome
- [ ] `npm pack --dry-run` in each package — verify tarball has only `dist/`, `package.json`, `README.md` (no `src/`, tests, tsconfigs)

---

## Phase 7 — End-to-end manual verification (the important one)

- [ ] Scaffold throwaway app: `npx create-next-app@latest test-oopsie --app --typescript`
- [ ] `npm install /Users/troy/projects/oopsie_exceptions_javascript/packages/nextjs` (file link) + transitive workspace deps
- [ ] Wire `instrumentation.ts` (`register` + `onRequestError`)
- [ ] Mount `<OopsieClient />` in `app/layout.tsx`
- [ ] Add `app/global-error.tsx` using `GlobalErrorReporter`
- [ ] Set `OOPSIE_WEBHOOK_URL=http://localhost:3099/api/v1/exceptions` + `OOPSIE_TOKEN`
- [ ] Confirm local Oopsie collector is running on :3099
- [ ] Trigger error (a): `throw` inside a Server Action → verify POST received
- [ ] Trigger error (b): `throw` inside a Route Handler → verify POST received
- [ ] Trigger error (c): `throw` in a client Component `useEffect` → verify POST received
- [ ] Diff received payload against a Ruby-sourced payload — shared fields byte-identical
- [ ] Write a small automated smoke-test script (`scripts/e2e-smoke.ts`) that boots the test app, fires the three errors via `fetch`/Playwright, and asserts three POSTs land — so E2E is repeatable, not manual-only

---

## Phase 8 — Docs & release-readiness (no publish yet)

- [ ] Root `README.md` final polish: install, quickstart, Next.js setup, config table, Ruby/JS parity note
- [ ] Per-package `README.md` stubs with minimal usage
- [ ] `CHANGELOG.md` filled in with concrete v0.1.0 entries
- [ ] Add `CONTRIBUTING.md` (optional, dev setup notes)
- [ ] Verify `LICENSE` copyright holder matches gem

---

## Explicitly NOT in this todo list (deferred to v0.2+)

- Pages Router, Express, Fastify, Vue, SvelteKit adapters
- Source map upload tooling
- Retry/queue for async delivery
- Breadcrumbs / spans
- Sampling / rate limiting
- Publishing to npm (separate explicit step when you ask)
- `git commit` / `git push` (per your global rule — staged only, you drive)

---

## Open questions to resolve during scaffold

- Next.js client config: `oopsie.client.config.ts` file (Sentry-style) **vs.** `<OopsieProvider>` in `layout.tsx` (React-idiomatic)? Decide once Phase 2 is done and we can feel the ergonomics.
