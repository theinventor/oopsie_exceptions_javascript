# @oopsie-exceptions/nextjs

Next.js App Router bindings for [`@oopsie-exceptions`](../../README.md). Modeled on Sentry's `sentry.{client,server}.config.ts` pattern.

## Install

```bash
npm install @oopsie-exceptions/core @oopsie-exceptions/node @oopsie-exceptions/browser @oopsie-exceptions/nextjs
```

## Quickstart

### 1. Two config files at your project root

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

### 2. `instrumentation.ts`

```ts
import config from "./oopsie.server.config";
import { configureServer, onRequestError } from "@oopsie-exceptions/nextjs/instrumentation";

export function register() {
  configureServer(config);
}

export { onRequestError };
```

### 3. Browser bootstrap (Sentry-style `"use client"` wrapper)

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
// ...
<OopsieBootstrap />
```

### 4. `app/global-error.tsx`

```tsx
"use client";
import { GlobalErrorReporter } from "@oopsie-exceptions/nextjs/global-error";

export default function GlobalError({ error, reset }) {
  return <GlobalErrorReporter error={error} reset={reset} />;
}
```

## Manual capture

```ts
// Server-side (route handler, server action, API, middleware):
import { captureException } from "@oopsie-exceptions/nextjs/instrumentation";

// Client component:
import { captureException } from "@oopsie-exceptions/nextjs";
```

`wrapServerAction` / `wrapRouteHandler` wrap a function so thrown errors are reported + re-thrown:

```ts
import { wrapServerAction, wrapRouteHandler } from "@oopsie-exceptions/nextjs";

export const createPost = wrapServerAction(async (data) => { /* ... */ });
export const GET = wrapRouteHandler(async (req) => { /* ... */ });
```

See the [root README](../../README.md) for full API docs.
