"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <main className="not-found">
      <h1>This page didn’t load.</h1>
      <p>Check your connection and try again.</p>
      <nav aria-label="Recover">
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/">Home</Link>
        <Link href="/journal">Journal</Link>
      </nav>
    </main>
  );
}
