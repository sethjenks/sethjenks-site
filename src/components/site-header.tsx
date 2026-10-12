"use client";

import { usePathname } from "next/navigation";
import { SoftMatterMark } from "@/components/soft-matter-mark";

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <SoftMatterMark home={home} />
      </div>
    </header>
  );
}
