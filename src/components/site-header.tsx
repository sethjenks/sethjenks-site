"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyButton } from "@/components/key-button";
import { CONTACTS } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const onLog = pathname === "/log" || pathname.startsWith("/log/");
  const keyHref = home || onLog ? "#log" : "/#log";

  return (
    <header className="site-header">
      <div className="site-header-bar">
        {home ? (
          <h1 className="site-title">Seth Jenks</h1>
        ) : (
          <Link href="/" className="site-wordmark">
            Seth Jenks
          </Link>
        )}
        <nav className="site-nav" aria-label="Primary">
          <Link href="/#work">Work</Link>
          <Link href="/log" aria-current={onLog ? "page" : undefined}>
            Log
          </Link>
          {CONTACTS.map((contact) => (
            <a key={contact.href} href={contact.href} rel="noreferrer" target="_blank">
              {contact.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </nav>
        <KeyButton href={keyHref}>Log</KeyButton>
      </div>
    </header>
  );
}
