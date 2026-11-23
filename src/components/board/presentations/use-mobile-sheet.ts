"use client";

import { useSyncExternalStore } from "react";

/** Phone widths, and any coarse pointer. The desktop stage stays on a fine pointer at 720px and up. */
export const MOBILE_SHEET_QUERY = "(max-width: 719px), (pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MOBILE_SHEET_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useMobileSheet() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_SHEET_QUERY).matches,
    () => false,
  );
}
