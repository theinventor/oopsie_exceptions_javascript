import ErrorStackParser from "error-stack-parser";
import type { BacktraceFrame, ErrorCause } from "./types.js";

const MAX_CAUSE_DEPTH = 10;

/**
 * Returns the parsed backtrace as an array of raw strings, matching the
 * Ruby payload shape (array of "file:line:in `method'"-style lines).
 */
export function backtraceLines(error: unknown): string[] | null {
  if (!isErrorLike(error)) return null;
  const frames = safeParse(error);
  if (!frames) return error.stack ? error.stack.split("\n") : null;
  return frames.map(formatFrame);
}

export function firstLine(error: unknown): BacktraceFrame | null {
  if (!isErrorLike(error)) return null;
  const frames = safeParse(error);
  const head = frames?.[0];
  if (!head) return null;
  return toFrame(head);
}

export function collectCauses(error: unknown): ErrorCause[] {
  const causes: ErrorCause[] = [];
  if (!isErrorLike(error)) return causes;

  let current = errorCause(error);
  let depth = 0;
  while (current && depth < MAX_CAUSE_DEPTH) {
    causes.push({
      class_name: errorClassName(current),
      message: truncate(String(current.message ?? ""), 1_000),
      first_line: firstLine(current),
    });
    current = errorCause(current);
    depth += 1;
  }
  return causes;
}

export function errorClassName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const n = (error as { name?: unknown }).name;
    if (typeof n === "string" && n.length > 0) return n;
  }
  if (error && typeof error === "object" && error.constructor?.name) {
    return error.constructor.name;
  }
  return "Error";
}

function formatFrame(frame: StackFrameLike): string {
  const fileName = frame.fileName ?? "<anonymous>";
  const lineNumber = frame.lineNumber ?? 0;
  const functionName = frame.functionName ?? "<anonymous>";
  return `${fileName}:${lineNumber}:in \`${functionName}'`;
}

function toFrame(frame: StackFrameLike): BacktraceFrame {
  const out: BacktraceFrame = {};
  if (frame.fileName !== undefined) out.file = frame.fileName;
  if (frame.lineNumber !== undefined) out.line = frame.lineNumber;
  if (frame.columnNumber !== undefined) out.column = frame.columnNumber;
  if (frame.functionName !== undefined) out.method = frame.functionName;
  return out;
}

function isErrorLike(
  v: unknown,
): v is { message?: unknown; stack?: string; cause?: unknown; name?: string } {
  return !!v && typeof v === "object";
}

function errorCause(error: object): Error | null {
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error ? cause : null;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

interface StackFrameLike {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  functionName?: string;
}

function safeParse(error: unknown): StackFrameLike[] | null {
  try {
    return ErrorStackParser.parse(error as Error) as unknown as StackFrameLike[];
  } catch {
    return null;
  }
}
