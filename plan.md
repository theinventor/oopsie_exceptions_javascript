# Plan: `oopsie_exceptions_javascript` — TypeScript npm monorepo

## Context

You maintain a Ruby gem (`oopsie_exceptions` v1.1.0) that captures unhandled exceptions from Rack/Rails apps and POSTs structured JSON to one-or-more webhook endpoints with bearer auth. You want a JavaScript/npm equivalent focused on **Next.js (server + client)** so a single Oopsie collector can receive exceptions from both Ruby and JS apps. Architecture is borrowed from AppSignal's JS monorepo: small core, transport abstraction, thin framework bindings, dual ESM/CJS via `tsc`.

Target repo: `git@github.com:theinventor/oopsie_exceptions_javascript.git`
Target directory: `/Users/troy/projects/oopsie_exceptions_javascript` (already exists, empty)
npm scope: `@oopsie-exceptions` (org you just created)
Personal username: `theinventor`

**Invariant:** the webhook payload shape and HTTP protocol (POST, JSON body, custom auth headers, configurable URL) must match the Ruby gem exactly so the Oopsie collector is the same. Payload field names are frozen (`notifier`, `version`, `timestamp`, `app`, `error`, `context`, `server`) — match them one-for-one.

## Recommended approach

### Repo shape
- npm workspaces monorepo, TypeScript end-to-end, strict mode on.
- Build with plain `tsc` (no bundler): two tsconfigs per package → `dist/esm` + `dist/cjs`. Matches AppSignal's proven setup and ships tree-shakeable output.
- Test with **Vitest** (faster than Jest, native ESM, less config; AppSignal uses Jest but Vitest is the better 2026 default).
- Lint/format: `biome` (single tool, zero config). Skip eslint+prettier complexity.
- CI: GitHub Actions — test on Node 20/22, typecheck, build, check `npm pack` output.

### Initial packages (v0.1)

| Package | Purpose |
| --- | --- |
| `@oopsie-exceptions/core` | Runtime-agnostic: `OopsieClient`, payload builder, config, filters, `before_notify`/`ignoreErrors` hooks, context store, transport interface, multi-webhook fan-out. Zero runtime deps. |
| `@oopsie-exceptions/node` | Node runtime: `fetch`-based transport, `uncaughtException`/`unhandledRejection` handlers, `AsyncLocalStorage` context scope. Depends on core. |
| `@oopsie-exceptions/browser` | Browser runtime: `fetch` transport, `window.onerror` + `unhandledrejection` handlers. Depends on core. |
| `@oopsie-exceptions/nextjs` | Next.js App Router bindings. Depends on `node` + `browser`. Exports `init()`, `onRequestError`, `captureException`, `GlobalError` component helper, Server Action wrapper. |

Pages Router + Express/Fastify are deliberately deferred to v0.2+.

### Core API (mirrors Ruby gem's surface)

```ts
import { OopsieClient } from "@oopsie-exceptions/core"

const client = new OopsieClient({
  appName: "MyApp",
  environment: process.env.NODE_ENV,
  enabled: true,
  webhooks: [
    { url: "https://oopsie.example.com/api/v1/exceptions",
      headers: { Authorization: `Bearer ${process.env.OOPSIE_TOKEN}` },
      name: "oopsie-prod" },
  ],
  filterParameters: ["password", "secret", "token", "api_key"],
  filterHeaders: ["authorization", "cookie", "set-cookie"],
  ignoreErrors: ["NotFoundError", /AbortError/],
  asyncDelivery: true,     // fire-and-forget Promise; no blocking
  captureRequestBody: false,
  beforeNotify: (payload) => payload,   // return null to drop
  contextBuilder: (req) => ({ user: {...}, action: "..." }),
})

client.captureException(err, { context: {...}, handled: false })
client.setContext({ user: { id, email }, action: "posts#create" })
client.withContext({ user: {...} }, async () => { /* scoped */ })
client.use(plugin)   // AppSignal-style: plugin(client) monkey-patches or extends
```

### Next.js integration (App Router)

Single package `@oopsie-exceptions/nextjs` with three entry points:

1. **Server init via `instrumentation.ts`**
   ```ts
   // instrumentation.ts
   export { register, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation"
   ```
   `register()` constructs the singleton client from env vars (`OOPSIE_WEBHOOK_URL`, `OOPSIE_TOKEN`, `OOPSIE_APP_NAME`) or a user-provided `oopsie.server.config.ts`. `onRequestError` is the Next.js 15+ hook fired for RSC, Route Handler, Server Action, and middleware errors — we receive `(err, request, context)` and forward to `client.captureException`.

2. **Client init** via a small `<OopsieClient />` component mounted in `app/layout.tsx` (or a config file `oopsie.client.config.ts`) that registers the browser handlers and exposes `captureException` from any client component.

3. **Global error UI helper**
   ```tsx
   // app/global-error.tsx
   "use client"
   import { GlobalErrorReporter } from "@oopsie-exceptions/nextjs"
   export default function GlobalError({ error, reset }) {
     return <GlobalErrorReporter error={error} reset={reset} />
   }
   ```
   Reports the error, then renders the user's fallback (or a default one).

Additional helpers: `wrapServerAction(fn)`, `wrapRouteHandler(handler)` for explicit capture where `onRequestError` doesn't cover (e.g. intentional try/catch that swallows but wants to log).

### Payload parity with Ruby gem

Build the payload in `@oopsie-exceptions/core/src/payload.ts` with this exact top-level shape (matches `lib/oopsie_exceptions/payload.rb`):

```jsonc
{
  "notifier": "OopsieExceptions",
  "version": "<js pkg version>",
  "timestamp": "<ISO 8601>",
  "app": { "name": "...", "environment": "..." },
  "error": { "class_name", "message", "backtrace", "first_line", "causes", "handled" },
  "context": { "request": {...}, "user": {...}, "action": "...", "job": {...} },
  "server": { "hostname", "pid", "ruby_version": null, "node_version": "..." }
}
```

Note: `ruby_version` stays as a known key (null for JS) so existing collector dashboards don't choke; add `node_version` alongside. Error `causes` walks `error.cause` chain. Backtrace uses [`error-stack-parser`](https://www.npmjs.com/package/error-stack-parser) — tiny, zero-dep, battle-tested.

### Transport

`Transport` interface in core: `send(webhook, body): Promise<void>`. Node + Browser both use global `fetch` (Node 18+). Keep `XMLHttpRequest` fallback out of v0.1. `asyncDelivery: true` means `captureException` returns immediately and the POST is fire-and-forget with a caught `.catch(log)`. Sync mode awaits. No queue/retry in v0.1 (Ruby gem relies on ActiveJob for that; JS equivalent would be BullMQ/user's own queue and is out of scope).

### Files to create (v0.1)

Root:
- `package.json` (workspaces `["packages/*"]`, private, scripts: `build`, `test`, `typecheck`, `lint`, `release`)
- `tsconfig.base.json`, `tsconfig.json` (references)
- `.gitignore`, `.npmignore` template, `.npmrc`, `.node-version`
- `README.md` (port structure from Ruby gem README with JS/Next.js examples)
- `CHANGELOG.md` (start at `## [0.1.0] - unreleased`)
- `LICENSE` (MIT, matching gem)
- `biome.json`, `vitest.config.ts`
- `.github/workflows/ci.yml` (test + typecheck + build matrix)

Per package (`packages/{core,node,browser,nextjs}/`):
- `package.json` with `main`, `module`, `types`, `exports` map, `publishConfig: { "access": "public" }`
- `tsconfig.cjs.json`, `tsconfig.esm.json`
- `src/index.ts`, `src/__tests__/*.test.ts`

`packages/core/src/`: `client.ts`, `config.ts`, `payload.ts`, `transport.ts`, `context.ts`, `filters.ts`, `backtrace.ts`, `types.ts`, `index.ts`.

`packages/nextjs/src/`: `instrumentation.ts`, `client.tsx` (React component for client init), `global-error.tsx`, `wrap-server-action.ts`, `wrap-route-handler.ts`, `capture-exception.ts`, `index.ts`.

### Git setup (what I'll actually run, once out of plan mode)

```bash
cd /Users/troy/projects/oopsie_exceptions_javascript
git init -b main
git remote add origin git@github.com:theinventor/oopsie_exceptions_javascript.git
# ...scaffold files per above...
git add -A
# NO commit — per your global rule, I will not commit without you asking
```

Per your global `CLAUDE.md`, I will **not** `git commit` or `git push` unless you explicitly ask. I'll stop at staged-or-unstaged files and let you decide.

## Critical files (Ruby gem references to mirror)

- `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/payload.rb` — **exact** payload shape to match
- `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/configuration.rb` — config option names/defaults
- `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/webhook_client.rb` — HTTP behavior (headers, timeouts)
- `/Users/troy/projects/oopsie_exceptions/lib/oopsie_exceptions/context.rb` — context merge semantics
- `/Users/troy/projects/oopsie_exceptions/README.md` — user-facing API shape to translate

## Verification

1. `npm install` at root succeeds; workspaces resolve.
2. `npm run build` produces `dist/esm` and `dist/cjs` for all four packages; `.d.ts` emitted.
3. `npm run typecheck` passes with `strict: true`.
4. `npm run test` runs Vitest — unit coverage for payload builder (snapshot against a fixture that matches a real Ruby-sent payload), filters, context store, transport with mocked fetch.
5. **End-to-end manual test (most important):**
   - Spin up a throwaway `npx create-next-app@latest test-oopsie --app --typescript`
   - `npm install /Users/troy/projects/oopsie_exceptions_javascript/packages/nextjs` (file link)
   - Point `OOPSIE_WEBHOOK_URL` at `http://localhost:3099/api/v1/exceptions` (your local collector, same one the Ruby gem dev config uses)
   - Trigger three errors: (a) `throw` in a Server Action, (b) `throw` in a Route Handler, (c) `throw` in a client Component's `useEffect`.
   - Confirm 3 POSTs arrive at the collector with payload shape matching a Ruby-sourced payload byte-for-byte on shared fields.
6. `npm pack --dry-run` in each package — inspect the tarball contents are sane (no `src/`, no tests, no tsconfig; only `dist/` + `package.json` + `README.md`).
7. Do **not** publish to npm in this plan — that's a separate explicit step you'll request.

## Explicitly out of scope (for v0.1)
- Pages Router, Express, Fastify, React (standalone), Vue, SvelteKit → all easy v0.2+ adds once core is proven.
- Source map upload tooling (AppSignal has a webpack plugin) — add when needed.
- Retry/queue for async delivery — rely on user's queue if they want durability.
- Breadcrumbs / spans — Ruby gem doesn't have these; keep parity.
- Sampling / rate limiting — not in Ruby gem.

## Open question for later
Should the Next.js client package read config from `oopsie.client.config.ts` (Sentry-style) or from a `<OopsieProvider>` mounted in `app/layout.tsx` (React-idiomatic)? Defer the call until I've scaffolded — will propose the concrete API then.
