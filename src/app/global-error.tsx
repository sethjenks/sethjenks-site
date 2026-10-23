"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          background: "oklch(98.5% 0 none)",
          color: "oklch(17.8% 0 none)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: "42rem",
            marginInline: "auto",
            padding: "5rem 1.5rem 6rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            This page didn’t load.
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: 16,
              lineHeight: 1.5,
              color: "oklch(52.8% 0 none)",
            }}
          >
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minWidth: 44,
              minHeight: 44,
              marginTop: 8,
              padding: 0,
              border: 0,
              background: "none",
              color: "inherit",
              font: "inherit",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
