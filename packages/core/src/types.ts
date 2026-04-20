/**
 * Public types for @oopsie-exceptions/core.
 *
 * The payload shape mirrors the Ruby gem's Payload.build output so the same
 * collector accepts both. Field names are frozen across Ruby and JS.
 */

export interface Webhook {
  url: string;
  headers?: Record<string, string>;
  name?: string;
}

export interface BacktraceFrame {
  file?: string;
  line?: number;
  column?: number;
  method?: string;
  raw?: string;
}

export interface ErrorCause {
  class_name: string;
  message: string;
  first_line: BacktraceFrame | null;
}

export interface OopsiePayload {
  notifier: "OopsieExceptions";
  version: string;
  timestamp: string;
  app: {
    name: string;
    environment: string;
  };
  error: {
    class_name: string;
    message: string;
    backtrace: string[] | null;
    first_line: BacktraceFrame | null;
    causes: ErrorCause[];
    handled: boolean;
  };
  context: OopsieContext;
  server: OopsieServerInfo;
}

export type OopsieContext = Record<string, unknown>;

export interface OopsieServerInfo {
  hostname: string | null;
  pid: number | null;
  ruby_version: null;
  node_version?: string | null;
  user_agent?: string | null;
  url?: string | null;
  [key: string]: unknown;
}

export type IgnoreMatcher = string | RegExp | ((error: Error) => boolean);

export type BeforeNotifyHook = (
  payload: OopsiePayload,
) => OopsiePayload | null | Promise<OopsiePayload | null>;

export interface CaptureOptions {
  context?: OopsieContext;
  handled?: boolean;
}

export interface ClientConfig {
  appName: string;
  environment: string;
  webhooks: Webhook[];
  enabled?: boolean;
  asyncDelivery?: boolean;
  timeoutMs?: number;
  filterParameters?: (string | RegExp)[];
  filterHeaders?: (string | RegExp)[];
  captureRequestBody?: boolean;
  ignoreErrors?: IgnoreMatcher[];
  beforeNotify?: BeforeNotifyHook;
  transport?: Transport;
  contextStore?: ContextStore;
  serverInfo?: () => OopsieServerInfo;
  logger?: Logger;
  packageVersion?: string;
}

export interface NormalizedConfig extends Required<Omit<ClientConfig, "transport" | "contextStore" | "serverInfo" | "beforeNotify" | "logger">> {
  transport: Transport;
  contextStore: ContextStore;
  serverInfo: () => OopsieServerInfo;
  beforeNotify: BeforeNotifyHook | null;
  logger: Logger;
}

export interface Transport {
  send(webhook: Webhook, payload: OopsiePayload, opts: { timeoutMs: number }): Promise<void>;
}

export interface ContextStore {
  get(): OopsieContext;
  set(ctx: OopsieContext): void;
  merge(ctx: OopsieContext): void;
  clear(): void;
  withContext<T>(ctx: OopsieContext, fn: () => T | Promise<T>): Promise<T>;
}

export interface Logger {
  debug?: (msg: string, meta?: unknown) => void;
  info?: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
}

export type Plugin = (client: {
  config: NormalizedConfig;
  captureException: (err: unknown, opts?: CaptureOptions) => Promise<void>;
}) => void;
