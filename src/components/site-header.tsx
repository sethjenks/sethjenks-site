"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SoftMatterMark } from "@/components/soft-matter-mark";

const NAV = [
  { href: "/", label: "Work" },
  { href: "/journal", label: "Journal" },
] as const;

function navCurrent(pathname: string, href: (typeof NAV)[number]["href"]) {
  if (href === "/journal") {
    return pathname === "/journal" || pathname.startsWith("/journal/");
  }

  if (href === "/") {
    return pathname === "/";
  }

  return false;
}

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <header className="site-header" data-compact={home ? undefined : ""}>
      <div className="site-header-bar">
        <SoftMatterMark home={home} />
        {home ? null : (
          <nav className="site-nav" aria-label="Pages">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={navCurrent(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
