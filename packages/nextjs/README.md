# @oopsie-exceptions/nextjs

Next.js App Router bindings for [`@oopsie-exceptions`](../../README.md).

## Quick start

### 1. Server init via `instrumentation.ts`

```ts
// instrumentation.ts (project root)
export { register, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation";
```

`register()` builds the server client from env vars (or from `oopsie.server.config.ts` if present).
`onRequestError` is Next.js 15+'s official server-side error hook — it fires for RSC, Route Handler, Server Action, and Middleware errors.

### 2. Client init via `<OopsieClient />`

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

### 3. Global error UI

```tsx
// app/global-error.tsx
"use client";
import { GlobalErrorReporter } from "@oopsie-exceptions/nextjs/global-error";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return <GlobalErrorReporter error={error} reset={reset} />;
}
```

### 4. Optional explicit capture

```ts
import { wrapServerAction } from "@oopsie-exceptions/nextjs";

export const createPost = wrapServerAction(async (data) => {
  // ...
});
```

## Environment variables

- `OOPSIE_WEBHOOK_URL` — primary webhook URL
- `OOPSIE_TOKEN` — Bearer token (sent as `Authorization: Bearer ...`)
- `OOPSIE_APP_NAME` — optional, defaults to `"app"`

See the [root README](../../README.md) for the full config reference.
