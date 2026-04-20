import { describe, expect, it } from "vitest";
import { backtraceLines, collectCauses, errorClassName, firstLine } from "../backtrace.js";

function makeErrorWithStack(stack: string): Error {
  const e = new Error("boom");
  e.stack = stack;
  return e;
}

const V8_STACK = `Error: boom
    at foo (/app/src/x.ts:14:7)
    at bar (/app/src/y.ts:3:1)`;

const FIREFOX_STACK = `foo@file:///app/src/x.ts:14:7
bar@file:///app/src/y.ts:3:1`;

describe("backtraceLines", () => {
  it("returns null for non-Error inputs", () => {
    expect(backtraceLines("not an error")).toBeNull();
    expect(backtraceLines(null)).toBeNull();
  });

  it("parses V8-style stacks", () => {
    const bt = backtraceLines(makeErrorWithStack(V8_STACK));
    expect(bt?.length).toBeGreaterThan(0);
    expect(bt?.[0]).toContain("foo");
    expect(bt?.[0]).toContain("/app/src/x.ts");
    expect(bt?.[0]).toContain("14");
  });

  it("parses Firefox-style stacks", () => {
    const bt = backtraceLines(makeErrorWithStack(FIREFOX_STACK));
    expect(bt?.length).toBeGreaterThan(0);
    expect(bt?.[0]).toContain("foo");
  });

  it("falls back to splitting raw stack on newline when parser fails", () => {
    const err = makeErrorWithStack("nonsense\nsecond line");
    const bt = backtraceLines(err);
    expect(bt).toBeTruthy();
    expect(bt?.length).toBeGreaterThan(0);
  });
});

describe("firstLine", () => {
  it("returns null for non-errors", () => {
    expect(firstLine(null)).toBeNull();
  });

  it("parses file/line/method for V8 stacks", () => {
    const frame = firstLine(makeErrorWithStack(V8_STACK));
    expect(frame?.file).toBe("/app/src/x.ts");
    expect(frame?.line).toBe(14);
    expect(frame?.method).toBe("foo");
  });
});

describe("collectCauses", () => {
  it("returns [] when error has no cause", () => {
    expect(collectCauses(new Error("solo"))).toEqual([]);
  });

  it("walks single-level error.cause chain", () => {
    const inner = new Error("inner");
    const outer = new Error("outer", { cause: inner });
    const causes = collectCauses(outer);
    expect(causes).toHaveLength(1);
    expect(causes[0]?.message).toBe("inner");
  });

  it("walks multi-level chain", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    const c = new Error("c", { cause: b });
    const causes = collectCauses(c);
    expect(causes.map((x) => x.message)).toEqual(["b", "a"]);
  });

  it("stops at MAX_CAUSE_DEPTH (10) to avoid infinite loops", () => {
    let err: Error = new Error("base");
    for (let i = 0; i < 20; i += 1) {
      err = new Error(`wrap-${i}`, { cause: err });
    }
    const causes = collectCauses(err);
    expect(causes).toHaveLength(10);
  });

  it("truncates cause messages to 1000 chars", () => {
    const inner = new Error("x".repeat(5000));
    const outer = new Error("outer", { cause: inner });
    const causes = collectCauses(outer);
    expect(causes[0]?.message.length).toBe(1000);
  });
});

describe("errorClassName", () => {
  it("returns class name for built-in Error subclasses", () => {
    expect(errorClassName(new TypeError("x"))).toBe("TypeError");
    expect(errorClassName(new RangeError("x"))).toBe("RangeError");
  });

  it("respects explicit error.name", () => {
    const e = new Error("x");
    e.name = "CustomError";
    expect(errorClassName(e)).toBe("CustomError");
  });

  it("returns 'Error' for non-error inputs", () => {
    expect(errorClassName("string")).toBe("Error");
    expect(errorClassName(null)).toBe("Error");
  });
});
