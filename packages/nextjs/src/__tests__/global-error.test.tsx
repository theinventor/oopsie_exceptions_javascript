// @vitest-environment jsdom
// Note: GlobalErrorReporter renders <html><body> because Next.js
// requires it — global-error.tsx replaces the root layout on error.
// Jsdom warns about nested html/body inside an existing document.
// The warnings are expected and harmless.
import type { OopsiePayload, Transport } from "@oopsie-exceptions/core";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalErrorReporter } from "../global-error.js";
import { configureClient, resetForTests } from "../singleton.js";

const payloads: OopsiePayload[] = [];
const transport: Transport = {
  send: async (_, p) => {
    payloads.push(p);
  },
};

afterEach(() => {
  resetForTests();
  payloads.length = 0;
});

function install() {
  configureClient({
    appName: "t",
    environment: "test",
    webhooks: [{ url: "/hook" }],
    transport,
    asyncDelivery: false,
  });
}

describe("<GlobalErrorReporter />", () => {
  it("reports the error on mount exactly once", async () => {
    install();
    const err = new Error("render boom");
    render(<GlobalErrorReporter error={err} reset={() => {}} />);
    await vi.waitFor(() => expect(payloads).toHaveLength(1));
    expect(payloads[0]?.error.message).toBe("render boom");
  });

  it("passes error.digest through as context", async () => {
    install();
    const err: Error & { digest?: string } = new Error("x");
    err.digest = "abc123";
    render(<GlobalErrorReporter error={err} reset={() => {}} />);
    await vi.waitFor(() => expect(payloads).toHaveLength(1));
    expect((payloads[0]?.context.next as Record<string, unknown>)?.digest).toBe("abc123");
  });

  it("does not re-report on rerender with same error", async () => {
    install();
    const err = new Error("stable");
    const { rerender } = render(<GlobalErrorReporter error={err} reset={() => {}} />);
    rerender(<GlobalErrorReporter error={err} reset={() => {}} />);
    await vi.waitFor(() => expect(payloads.length).toBeGreaterThan(0));
    expect(payloads).toHaveLength(1);
  });

  it("renders the default fallback UI when no children", () => {
    install();
    const { container } = render(<GlobalErrorReporter error={new Error("x")} reset={() => {}} />);
    expect(container.textContent).toMatch(/Something went wrong/);
    const btn = container.querySelector("button");
    expect(btn?.textContent).toMatch(/try again/i);
  });

  it("invokes reset when the default button is clicked", () => {
    install();
    const reset = vi.fn();
    const { container } = render(<GlobalErrorReporter error={new Error("x")} reset={reset} />);
    const btn = container.querySelector("button");
    expect(btn).toBeTruthy();
    btn?.click();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders user-supplied children element", () => {
    install();
    const { container } = render(
      <GlobalErrorReporter error={new Error("x")} reset={() => {}}>
        <p>custom fallback</p>
      </GlobalErrorReporter>,
    );
    expect(container.textContent).toMatch(/custom fallback/);
  });

  it("calls children-as-function with { error, reset }", () => {
    install();
    const reset = vi.fn();
    const err = new Error("x");
    const { container } = render(
      <GlobalErrorReporter error={err} reset={reset}>
        {({ error, reset: r }) => (
          <div>
            fn:{error.message}:{typeof r}
          </div>
        )}
      </GlobalErrorReporter>,
    );
    expect(container.textContent).toMatch(/fn:x:function/);
  });

  it("is a no-op when no client is initialized (does not throw)", async () => {
    await expect(async () => {
      render(<GlobalErrorReporter error={new Error("x")} reset={() => {}} />);
    }).not.toThrow();
  });
});
