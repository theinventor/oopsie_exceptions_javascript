# @oopsie-exceptions/node

Node runtime bindings for [`@oopsie-exceptions`](../../README.md). Adds:

- `NodeTransport` — `fetch`-based HTTP transport with timeout.
- `installGlobalHandlers()` — catches `uncaughtException` + `unhandledRejection`.
- `AsyncLocalStorageContextStore` — request-scoped context that doesn't bleed between concurrent async tasks.

```ts
import { OopsieClient } from "@oopsie-exceptions/core";
import {
  AsyncLocalStorageContextStore,
  NodeTransport,
  installGlobalHandlers,
  nodeServerInfo,
} from "@oopsie-exceptions/node";

const client = new OopsieClient({
  appName: "MyApp",
  environment: process.env.NODE_ENV ?? "development",
  webhooks: [{
    url: process.env.OOPSIE_WEBHOOK_URL!,
    headers: { Authorization: `Bearer ${process.env.OOPSIE_TOKEN}` },
  }],
  transport: new NodeTransport(),
  contextStore: new AsyncLocalStorageContextStore(),
  serverInfo: nodeServerInfo,
});

installGlobalHandlers(client);
```

See the [root README](../../README.md) for full API docs.
