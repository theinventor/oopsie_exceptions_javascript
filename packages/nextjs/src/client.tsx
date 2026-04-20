"use client";

import {
  BrowserTransport,
  browserServerInfo,
  installGlobalHandlers,
} from "@oopsie-exceptions/browser";
import { type ClientConfig, OopsieClient as CoreOopsieClient } from "@oopsie-exceptions/core";
import { useEffect } from "react";
import { configureClient } from "./singleton.js";

export interface OopsieClientProps {
  /**
   * Optional config override. When omitted, the client singleton is
   * built from props + sane browser defaults (BrowserTransport,
   * browserServerInfo).
   */
  config?: Partial<ClientConfig> & {
    webhookUrl?: string;
    token?: string;
  };
}

/**
 * Client-side initializer: mounts once in app/layout.tsx, installs
 * window error handlers, and registers the singleton browser client.
 * Renders nothing.
 */
export function OopsieClient({ config = {} }: OopsieClientProps): null {
  useEffect(() => {
    const { webhookUrl, token, ...rest } = config;
    const built: ClientConfig = {
      appName: rest.appName ?? "app",
      environment: rest.environment ?? "production",
      webhooks: rest.webhooks ?? [
        ...(webhookUrl
          ? [
              {
                url: webhookUrl,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                name: "oopsie",
              },
            ]
          : []),
      ],
      transport: rest.transport ?? new BrowserTransport(),
      serverInfo: rest.serverInfo ?? browserServerInfo,
      ...rest,
    };

    if (built.webhooks.length === 0) {
      console.warn(
        "[@oopsie-exceptions/nextjs] <OopsieClient /> mounted without a webhook URL; set `webhookUrl` prop or `webhooks` in config.",
      );
      return;
    }

    const client = configureClient(built);
    const uninstall = installGlobalHandlers(client);
    return () => {
      uninstall();
    };
  }, [config]);

  return null;
}

export { CoreOopsieClient as OopsieClientClass };
