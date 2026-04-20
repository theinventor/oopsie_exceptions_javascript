# @oopsie-exceptions/core

Runtime-agnostic core for [`@oopsie-exceptions`](../../README.md). Works in any JS environment with a `fetch` implementation. For Node you probably want `@oopsie-exceptions/node`; for browsers, `@oopsie-exceptions/browser`; for Next.js, `@oopsie-exceptions/nextjs`.

```ts
import { OopsieClient } from "@oopsie-exceptions/core";

const client = new OopsieClient({
  appName: "MyApp",
  environment: "production",
  webhooks: [
    { url: "https://oopsie.example.com/api/v1/exceptions",
      headers: { Authorization: `Bearer ${process.env.OOPSIE_TOKEN}` },
      name: "oopsie-prod" },
  ],
});

client.captureException(err);
```

See the [root README](../../README.md) for full API documentation.
