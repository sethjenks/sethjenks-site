"use client";

import { usePathname } from "next/navigation";
import { KeyButton } from "@/components/key-button";
import { SoftMatterMark } from "@/components/soft-matter-mark";

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const onJournal = pathname === "/journal" || pathname.startsWith("/journal/");
  const keyHref = onJournal ? "#journal" : "/journal";

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <SoftMatterMark home={home} />
        <KeyButton href={keyHref} play={home}>
          Journal
        </KeyButton>
      </div>
    </header>
  );
}
