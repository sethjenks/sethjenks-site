"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyButton } from "@/components/key-button";

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
        <KeyButton href={keyHref}>Log</KeyButton>
      </div>
    </header>
  );
}
