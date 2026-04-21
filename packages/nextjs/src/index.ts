// Browser-safe re-exports only. Server-side helpers (configureServer,
// getServerClient, envConfig) live on the /instrumentation subpath to
// keep node:os / node:async_hooks out of the client bundle.
export { captureException } from "./capture-exception.js";
export { wrapServerAction } from "./wrap-server-action.js";
export { wrapRouteHandler } from "./wrap-route-handler.js";
export { configureClient, getClientSideClient } from "./singleton.js";
export { extractConfig } from "./config-loader.js";
export type { OopsieServerConfigModule, OopsieClientConfigModule } from "./config-loader.js";
