"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { captureException } from "./capture-exception.js";

export interface GlobalErrorReporterProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Override the default fallback UI. Receives the error and reset fn. */
  children?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
}

/**
 * Drop-in component for `app/global-error.tsx`. Reports the error on
 * mount (exactly once per error identity) then renders either the
 * user's fallback (`children`) or a minimal default UI.
 */
export function GlobalErrorReporter({
  error,
  reset,
  children,
}: GlobalErrorReporterProps): ReactNode {
  const reportedRef = useRef<Error | null>(null);

  useEffect(() => {
    if (reportedRef.current === error) return;
    reportedRef.current = error;
    void captureException(error, {
      handled: false,
      context: error.digest ? { next: { digest: error.digest } } : {},
    });
  }, [error]);

  if (typeof children === "function") {
    return children({ error, reset });
  }
  if (children) return children;

  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <h1>Something went wrong</h1>
          <p style={{ color: "#555" }}>The error has been reported.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: 4,
              border: "1px solid #888",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
