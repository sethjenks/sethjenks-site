"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
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
    <main className="not-found">
      <h1>This page didn’t load.</h1>
      <p>Check your connection and try again.</p>
      <nav aria-label="Recover">
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/#work">Work</Link>
        <Link href="/journal">Journal</Link>
      </nav>
    </main>
  );
}
