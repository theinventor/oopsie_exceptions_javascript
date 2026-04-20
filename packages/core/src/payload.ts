import { backtraceLines, collectCauses, errorClassName, firstLine } from "./backtrace.js";
import { filterValues } from "./filters.js";
import type { CaptureOptions, NormalizedConfig, OopsiePayload } from "./types.js";

const MAX_MESSAGE_LENGTH = 10_000;

/**
 * Build an Oopsie payload. Shape matches the Ruby gem's Payload.build
 * (lib/oopsie_exceptions/payload.rb) exactly for shared fields so the
 * same collector accepts both.
 */
export function buildPayload(
  error: unknown,
  config: NormalizedConfig,
  opts: CaptureOptions = {},
): OopsiePayload {
  const handled = opts.handled ?? false;
  const requestCtx = filterValues(
    { ...config.contextStore.get(), ...(opts.context ?? {}) },
    config.filterParameters,
  );

  const message = extractMessage(error);
  const server = config.serverInfo();

  return {
    notifier: "OopsieExceptions",
    version: config.packageVersion,
    timestamp: new Date().toISOString(),
    app: {
      name: config.appName,
      environment: config.environment,
    },
    error: {
      class_name: errorClassName(error),
      message: message.slice(0, MAX_MESSAGE_LENGTH),
      backtrace: backtraceLines(error),
      first_line: firstLine(error),
      causes: collectCauses(error),
      handled,
    },
    context: requestCtx,
    server: {
      ...server,
      ruby_version: null,
      node_version: server.node_version ?? getNodeVersion(),
    },
  };
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message ?? "";
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    return typeof m === "string" ? m : String(m);
  }
  try {
    return String(error);
  } catch {
    return "<unprintable error>";
  }
}

function getNodeVersion(): string | null {
  if (typeof process !== "undefined" && typeof process.version === "string") {
    return process.version;
  }
  return null;
}
