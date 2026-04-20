# @oopsie-exceptions/browser

Browser runtime bindings for [`@oopsie-exceptions`](../../README.md). Adds:

- `BrowserTransport` — `fetch` with `keepalive: true` so in-flight reports survive page unload.
- `installGlobalHandlers()` — catches `window.onerror` + `unhandledrejection`; dedupes repeated errors.
- `browserServerInfo` — userAgent, url, and viewport dimensions for the `server` payload block.

```ts
import { OopsieClient } from "@oopsie-exceptions/core";
import {
  BrowserTransport,
  browserServerInfo,
  installGlobalHandlers,
} from "@oopsie-exceptions/browser";

const client = new OopsieClient({
  appName: "MyApp",
  environment: "production",
  webhooks: [{
    url: "/api/oopsie",
    headers: { Authorization: `Bearer ${window.__OOPSIE_TOKEN__}` },
  }],
  transport: new BrowserTransport(),
  serverInfo: browserServerInfo,
});

installGlobalHandlers(client);
```

See the [root README](../../README.md) for full API docs.
