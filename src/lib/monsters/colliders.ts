import type { Collider } from "./types";

const SELECTOR = [
  "header.site-header",
  "footer.site-footer",
  "h1",
  "h2",
  "h3",
  ".work-card",
  ".logo-card",
  ".project-row",
  ".message-board",
  ".monster-bar",
  ".create-strip",
  ".intro-name",
  ".role-line",
  ".intro-copy",
  ".log-entry",
  ".day-stamp",
  ".key-button",
].join(",");

function isPlatformElement(element: HTMLElement): boolean {
  if (element.closest(".tl-container")) {
    return false;
  }
  if (element.closest("[data-monster-root]")) {
    return false;
  }
  return true;
}

function distanceTo(collider: Collider, focus: { x: number; y: number }): number {
  const x = collider.x + collider.w / 2 - focus.x;
  const y = collider.y - focus.y;
  return x * x + y * y;
}

export function createColliderScan(): (
  now: number,
  focus: { x: number; y: number } | null,
  narrow: boolean,
) => Collider[] {
  let nodes: HTMLElement[] = [];
  let scannedAt = -Infinity;
  const keys = new WeakMap<HTMLElement, string>();
  let serial = 0;

  return (now, focus, narrow) => {
    if (now - scannedAt > 450 || nodes.length === 0) {
      nodes = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(isPlatformElement);
      scannedAt = now;
    }

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const tall = viewH * 0.7;
    const found: Collider[] = [];

    for (const element of nodes) {
      if (!element.isConnected) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 28 || rect.height < 10) {
        continue;
      }
      if (rect.bottom < -80 || rect.top > viewH + 80 || rect.right < -80 || rect.left > viewW + 80) {
        continue;
      }
      const lip = element.classList.contains("message-board") || rect.height > tall;
      let key = keys.get(element);
      if (!key) {
        serial += 1;
        key = `platform-${serial}`;
        keys.set(element, key);
      }
      found.push({
        key,
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: lip ? Math.min(12, rect.height) : rect.height,
        oneWay: lip,
      });
    }

    const cap = narrow ? 24 : 36;
    if (found.length > cap) {
      const origin = focus ?? { x: viewW / 2, y: viewH / 2 };
      found.sort((a, b) => distanceTo(a, origin) - distanceTo(b, origin));
      return found.slice(0, cap);
    }
    return found;
  };
}
