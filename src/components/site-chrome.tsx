"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteChrome({
  quietPaths,
  children,
}: {
  quietPaths: readonly string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const quiet = quietPaths.includes(pathname) || pathname === "/lab/card" || pathname === "/lab/shadows";
  const detail = pathname.startsWith("/work/");

  return (
    <>
      {quiet || detail ? null : <SiteHeader />}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {quiet ? null : <SiteFooter />}
    </>
  );
}
