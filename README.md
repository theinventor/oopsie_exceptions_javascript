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
npm install @oopsie-exceptions/nextjs
```

```ts
// instrumentation.ts
export { register, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation";
```

```tsx
// app/layout.tsx
import { OopsieClient } from "@oopsie-exceptions/nextjs/client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <OopsieClient />
        {children}
      </body>
    </html>
  );
}
```

```tsx
// app/global-error.tsx
"use client";
import { GlobalErrorReporter } from "@oopsie-exceptions/nextjs/global-error";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return <GlobalErrorReporter error={error} reset={reset} />;
}
```

Environment variables:

```
OOPSIE_WEBHOOK_URL=https://oopsie.example.com/api/v1/exceptions
OOPSIE_TOKEN=...
OOPSIE_APP_NAME=MyApp
```

## Direct client API (any runtime)

```ts
import { OopsieClient } from "@oopsie-exceptions/core";

const client = new OopsieClient({
  appName: "MyApp",
  environment: process.env.NODE_ENV,
  enabled: true,
  webhooks: [
    {
      url: "https://oopsie.example.com/api/v1/exceptions",
      headers: { Authorization: `Bearer ${process.env.OOPSIE_TOKEN}` },
      name: "oopsie-prod",
    },
  ],
  filterParameters: ["password", "secret", "token", "api_key"],
  filterHeaders: ["authorization", "cookie", "set-cookie"],
  ignoreErrors: ["NotFoundError", /AbortError/],
  asyncDelivery: true,
  beforeNotify: (payload) => payload, // return null to drop
});

client.captureException(err, { context: { orderId: 123 }, handled: true });
client.setContext({ user: { id: 42 } });
client.withContext({ tenantId: 7 }, async () => { /* scoped */ });
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
