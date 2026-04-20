// @vitest-environment jsdom
import { OopsieClient as CoreClient } from "@oopsie-exceptions/core";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OopsieClient } from "../client.js";
import { getClientSideClient, resetForTests } from "../singleton.js";

afterEach(() => {
  resetForTests();
  vi.restoreAllMocks();
});

describe("<OopsieClient />", () => {
  it("renders null", () => {
    const { container } = render(<OopsieClient config={{ webhookUrl: "/api/hook" }} />);
    expect(container.innerHTML).toBe("");
  });

  it("registers a singleton and installs window handlers when webhookUrl is given", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<OopsieClient config={{ webhookUrl: "/api/hook", token: "t" }} />);
    expect(getClientSideClient()).toBeInstanceOf(CoreClient);
    const events = addSpy.mock.calls.map(([e]) => e);
    expect(events).toContain("error");
    expect(events).toContain("unhandledrejection");
  });

  it("warns and skips init when no webhook URL is provided", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<OopsieClient />);
    expect(warn).toHaveBeenCalled();
    expect(getClientSideClient()).toBeNull();
  });

  it("uninstalls handlers on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<OopsieClient config={{ webhookUrl: "/api/hook" }} />);
    unmount();
    const events = removeSpy.mock.calls.map(([e]) => e);
    expect(events).toContain("error");
    expect(events).toContain("unhandledrejection");
  });
});
