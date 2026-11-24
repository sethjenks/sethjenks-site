/** Fade items in once they enter a scrollport. Items already on screen stay shown. */
export function revealOnScroll(items: readonly HTMLElement[], root: Element | null): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || items.length === 0) {
    for (const item of items) {
      item.setAttribute("data-reveal", "in");
    }
    return () => {};
  }

  const pending = new Set<HTMLElement>();

  for (const item of items) {
    if (entered(item, root)) {
      item.setAttribute("data-reveal", "in");
      continue;
    }
    item.setAttribute("data-reveal", "wait");
    pending.add(item);
  }

  if (pending.size === 0) {
    return () => {};
  }

  const update = () => {
    for (const item of pending) {
      if (!entered(item, root)) {
        continue;
      }
      item.setAttribute("data-reveal", "in");
      pending.delete(item);
    }
  };

  document.addEventListener("scroll", update, { passive: true, capture: true });
  window.addEventListener("resize", update);
  return () => {
    document.removeEventListener("scroll", update, { capture: true });
    window.removeEventListener("resize", update);
  };
}

function entered(item: HTMLElement, root: Element | null) {
  const box = item.getBoundingClientRect();
  const view = root?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
  const inset = Math.min(48, (view.bottom - view.top) * 0.08);
  return box.top < view.bottom - inset && box.bottom > view.top + inset;
}
