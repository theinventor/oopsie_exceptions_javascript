# @oopsie-exceptions (JavaScript)

Lightweight exception capture and webhook delivery for JavaScript runtimes, focused on **Next.js (App Router)** first. Sibling project to the [`oopsie_exceptions` Ruby gem](https://github.com/theinventor/oopsie_exceptions) — sends the same JSON webhook payload shape so one Oopsie collector receives exceptions from Ruby + JS apps.

Captures unhandled exceptions on server and browser, enriches them with request/user/context data, and POSTs structured JSON to one or more webhooks.

## Packages

| Package | Purpose |
| --- | --- |
| [`@oopsie-exceptions/core`](./packages/core) | Runtime-agnostic client, payload builder, filters, transport interface. Zero deps. |
| [`@oopsie-exceptions/node`](./packages/node) | Node runtime — `fetch` transport, `uncaughtException`/`unhandledRejection`, `AsyncLocalStorage` context. |
| [`@oopsie-exceptions/browser`](./packages/browser) | Browser runtime — `fetch` transport (keepalive), `window.onerror` + `unhandledrejection`. |
| [`@oopsie-exceptions/nextjs`](./packages/nextjs) | Next.js App Router bindings — `instrumentation.ts` hooks, `<OopsieClient />`, `GlobalErrorReporter`, server-action + route-handler wrappers. |

## Next.js quickstart

```bash
npm install @oopsie-exceptions/core @oopsie-exceptions/node @oopsie-exceptions/browser @oopsie-exceptions/nextjs
```

### 1. Create two config files at your project root

Modeled directly on Sentry's `sentry.{client,server}.config.ts`. The webhook URL and token are literal strings — your token is write-only at the collector, same security model as a Sentry DSN.

```ts
// oopsie.client.config.ts
import type { ClientConfig } from "@oopsie-exceptions/core";
import { BrowserTransport, browserServerInfo } from "@oopsie-exceptions/browser";

const config: ClientConfig = {
  appName: "my-app",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  webhooks: [{
    url: "https://oopsie.example.com/api/v1/exceptions",
    headers: { Authorization: "Bearer pk_write_only_token_abc123..." },
  }],
  transport: new BrowserTransport(),
  serverInfo: browserServerInfo,
  // Optional:
  // ignoreErrors: ["AbortError", /NetworkError/],
  // beforeNotify: (p) => { p.context.release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA; return p; },
};

export default config;
```

```ts
// oopsie.server.config.ts
import type { ClientConfig } from "@oopsie-exceptions/core";
import { NodeTransport, AsyncLocalStorageContextStore, nodeServerInfo } from "@oopsie-exceptions/node";

const config: ClientConfig = {
  appName: "my-app",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  webhooks: [{
    url: "https://oopsie.example.com/api/v1/exceptions",
    headers: { Authorization: `Bearer ${process.env.OOPSIE_SERVER_TOKEN}` },
  }],
  transport: new NodeTransport(),
  contextStore: new AsyncLocalStorageContextStore(),
  serverInfo: nodeServerInfo,
};

export default config;
```

### 2. Wire the server config via `instrumentation.ts`

```ts
// instrumentation.ts (project root, or src/instrumentation.ts)
import config from "./oopsie.server.config";
import { configureServer, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation";

export function register() {
  configureServer(config);
}

export { onRequestError };
```

### 3. Mount the browser client via a `"use client"` bootstrap

The config file contains class instances (`BrowserTransport`, etc.) which can't be serialized across the server→client boundary as React props. Mirror Sentry's pattern: a small `"use client"` wrapper imports the config and calls `configureClient` on mount.

```tsx
// app/oopsie-bootstrap.tsx
"use client";
import { configureClient } from "@oopsie-exceptions/nextjs";
import { installGlobalHandlers } from "@oopsie-exceptions/browser";
import { useEffect, useRef } from "react";
import oopsieConfig from "../oopsie.client.config";

export function OopsieBootstrap() {
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const client = configureClient(oopsieConfig);
    const uninstall = installGlobalHandlers(client);
    return () => { uninstall(); };
  }, []);
  return null;
}
```

```tsx
// app/layout.tsx (server component)
import { OopsieBootstrap } from "./oopsie-bootstrap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <OopsieBootstrap />
        {children}
      </body>
    </html>
  );
}
```

### 4. Add a global error UI

```tsx
// app/global-error.tsx
"use client";
import { GlobalErrorReporter } from "@oopsie-exceptions/nextjs/global-error";

export default function GlobalError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return <GlobalErrorReporter error={error} reset={reset} />;
}
```

That's it. Route Handler, Server Action, Server Component, and middleware errors are caught by `onRequestError`. Browser errors and unhandled rejections are caught by `<OopsieClient />`. Render errors show the global error UI and are reported once per error identity.

## Manual capture

```ts
// Server-side (Route Handler, Server Action, API, etc.):
import { captureException } from "@oopsie-exceptions/nextjs/instrumentation";
await captureException(err, { context: { orderId: 123 }, handled: true });

// Client component:
import { captureException } from "@oopsie-exceptions/nextjs";
await captureException(err, { handled: true });
```

For framework-agnostic use outside Next.js, construct an `OopsieClient` directly:

```ts
import { OopsieClient } from "@oopsie-exceptions/core";

const client = new OopsieClient({
  appName: "MyApp",
  environment: "production",
  webhooks: [{ url: "https://oopsie.example.com/api/v1/exceptions",
               headers: { Authorization: `Bearer ${process.env.OOPSIE_TOKEN}` } }],
});

client.captureException(err);
```

## Payload shape

Matches the Ruby gem for shared fields so the same collector accepts both:

```jsonc
{
  "notifier": "OopsieExceptions",
  "version": "<pkg version>",
  "timestamp": "<ISO 8601>",
  "app":     { "name": "...", "environment": "..." },
  "error":   { "class_name", "message", "backtrace", "first_line", "causes", "handled" },
  "context": { "request": {...}, "user": {...}, "action": "...", "job": {...} },
  "server":  { "hostname", "pid", "ruby_version": null, "node_version": "..." }
}
```

`ruby_version` is kept (null for JS) so dashboards built against the Ruby payload keep working.

## Config options

| Option | Default | Description |
| --- | --- | --- |
| `appName` | — (required) | Identifier sent in every payload. |
| `environment` | — (required) | Environment label (`production`, `staging`, etc.). |
| `webhooks` | — (required) | `Array<{ url, headers?, name? }>` — fan-out target list. |
| `enabled` | `true` | Master kill switch. |
| `asyncDelivery` | `true` | Fire-and-forget delivery. Set `false` to `await` transport. |
| `timeoutMs` | `10000` | HTTP timeout via AbortSignal. |
| `filterParameters` | `["password", "password_confirmation", "secret", "token", "api_key"]` | Keys (strings or RegExp) to redact in `context`. |
| `filterHeaders` | `["authorization", "cookie", "set-cookie"]` | Full header names to strip (case-insensitive). |
| `ignoreErrors` | `[]` | `(string | RegExp | (err) => boolean)[]` — matchers that drop errors silently. |
| `beforeNotify` | `null` | `(payload) => payload | null`. Return `null` to drop. Sync or async. |
| `transport` | `NoopTransport` | Supply `NodeTransport` / `BrowserTransport`. |
| `contextStore` | `InMemoryContextStore` | Swap in `AsyncLocalStorageContextStore` on servers. |
| `serverInfo` | `() => { hostname: null, pid: null, ruby_version: null }` | Function producing the `server` block. |
| `captureRequestBody` | `false` | Include first 10KB of JSON request bodies (mirrors Ruby). |

## Ruby/JS parity

The webhook payload shape is **frozen** across both implementations so one Oopsie collector can ingest errors from any mix of runtimes:

- Shared top-level keys: `notifier`, `version`, `timestamp`, `app`, `error`, `context`, `server`.
- `error` subfields (`class_name`, `message`, `backtrace`, `first_line`, `causes`, `handled`) match one-for-one.
- `server.ruby_version` is always present — Ruby fills it, JS pins it to `null`. JS adds `node_version` (and `user_agent`, `url`, `viewport` in the browser) alongside.
- Parameter + header filtering semantics match (substring-include for strings, RegExp for patterns).
- `error.cause` chain walked to a max depth of 10, cause messages truncated to 1000 chars.

## Development

```bash
npm install
npm run build
npm run test
npm run typecheck
npm run lint
```

## License

MIT — see [LICENSE](./LICENSE).
