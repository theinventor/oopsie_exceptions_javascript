import { errorClassName } from "./backtrace.js";
import { normalizeConfig } from "./config.js";
import { buildPayload } from "./payload.js";
import { sendAll } from "./transport.js";
import type {
  CaptureOptions,
  ClientConfig,
  IgnoreMatcher,
  NormalizedConfig,
  OopsieContext,
  Plugin,
} from "./types.js";

/**
 * Main entry point. Runtime-agnostic: pair with a concrete `transport`
 * from @oopsie-exceptions/node or /browser in real use.
 */
export class OopsieClient {
  readonly config: NormalizedConfig;

  constructor(config: ClientConfig) {
    this.config = normalizeConfig(config);
  }

  /**
   * Capture and deliver an exception. Respects `enabled`, `ignoreErrors`,
   * and `beforeNotify` hooks. Delivery is fire-and-forget when
   * `asyncDelivery: true` (default) — the promise resolves once queued.
   */
  async captureException(error: unknown, opts: CaptureOptions = {}): Promise<void> {
    if (!this.config.enabled) return;
    if (shouldIgnore(error, this.config.ignoreErrors)) return;

    const payload = buildPayload(error, this.config, opts);

    let finalPayload = payload;
    if (this.config.beforeNotify) {
      try {
        const result = await this.config.beforeNotify(payload);
        if (result == null) return;
        finalPayload = result;
      } catch (e) {
        this.config.logger.error("beforeNotify hook threw", e);
        return;
      }
    }

    const deliver = sendAll(this.config.transport, this.config.webhooks, finalPayload, {
      timeoutMs: this.config.timeoutMs,
      logger: this.config.logger,
    });

    if (this.config.asyncDelivery) {
      deliver.catch((e) => this.config.logger.error("delivery failed", e));
      return;
    }
    await deliver;
  }

  setContext(ctx: OopsieContext): void {
    this.config.contextStore.set(ctx);
  }

  mergeContext(ctx: OopsieContext): void {
    this.config.contextStore.merge(ctx);
  }

  clearContext(): void {
    this.config.contextStore.clear();
  }

  withContext<T>(ctx: OopsieContext, fn: () => T | Promise<T>): Promise<T> {
    return this.config.contextStore.withContext(ctx, fn);
  }

  /**
   * Register a plugin. Plugins receive `{ config, captureException }` and
   * may mutate config (e.g. install a runtime-specific transport) or
   * wire in additional handlers.
   */
  use(plugin: Plugin): this {
    plugin({
      config: this.config,
      captureException: (err, opts) => this.captureException(err, opts),
    });
    return this;
  }
}

function shouldIgnore(error: unknown, matchers: IgnoreMatcher[]): boolean {
  if (matchers.length === 0) return false;
  const className = errorClassName(error);
  const message = extractMessage(error);
  for (const m of matchers) {
    if (typeof m === "string") {
      if (className === m) return true;
    } else if (m instanceof RegExp) {
      if (m.test(className) || m.test(message)) return true;
    } else if (typeof m === "function") {
      try {
        if (error instanceof Error && m(error)) return true;
      } catch {
        // ignore matcher errors
      }
    }
  }
  return false;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message ?? "";
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    return typeof m === "string" ? m : String(m);
  }
  return "";
}
