import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nothing here",
};

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Nothing here.</h1>
      <p>That page is not on this site.</p>
      <nav aria-label="Recover">
        <Link href="/#work">Work</Link>
        <Link href="/journal">Journal</Link>
      </nav>
    </main>
  );
}
