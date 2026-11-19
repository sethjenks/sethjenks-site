"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function EscapeHome() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (window.self !== window.top) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat || event.defaultPrevented) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (document.querySelector("dialog[open]")) {
        return;
      }
      if (pathname === "/") {
        return;
      }
      router.push("/");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return null;
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}
