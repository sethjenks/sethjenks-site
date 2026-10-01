import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Nothing here.</h1>
      <nav aria-label="Recover">
        <Link href="/#work">Work</Link>
        <Link href="/log">Log</Link>
      </nav>
    </div>
  );
}
