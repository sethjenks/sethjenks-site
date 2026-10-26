"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Testimonial } from "@/lib/testimonials";

const START_PX = 8;
const COMMIT_PX = 36;

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  active: boolean;
  fromText: boolean;
  backIndex: number | null;
};

function motionOff(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canTilt(): boolean {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches && !motionOff()
  );
}

function resist(dx: number, limit: number): number {
  const sign = Math.sign(dx) || 1;
  const eased = limit * (1 - Math.exp(-Math.abs(dx) / (limit * 0.9)));
  return sign * Math.min(eased, limit);
}

function nudgeLimit(pile: HTMLElement | null, count: number): number {
  const section = pile?.closest(".testimonials");
  if (!(section instanceof HTMLElement)) {
    return 16;
  }

  const rect = section.getBoundingClientRect();
  const slack = Math.min(rect.left, window.innerWidth - rect.right);
  const pad = Number.parseFloat(getComputedStyle(section).paddingInlineStart) || 0;
  const room = Math.max(12, slack + pad - 6);
  const cap = count > 1 ? 88 : 20;
  return Math.min(cap, room);
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  const count = items.length;
  const [front, setFront] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const pileRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!restoreFocus.current) {
      return;
    }

    restoreFocus.current = false;
    pileRef.current
      ?.querySelector<HTMLElement>('[data-slot="0"] .testimonial-author')
      ?.focus();
  }, [front]);

  if (count === 0) {
    return null;
  }

  const frontSheet = () =>
    pileRef.current?.querySelector<HTMLElement>('[data-slot="0"]') ?? null;

  const resetTilt = () => {
    const sheet = frontSheet();
    sheet?.style.removeProperty("--note-tilt-x");
    sheet?.style.removeProperty("--note-tilt-y");
  };

  const tilt = (sheet: HTMLElement, event: { clientX: number; clientY: number }) => {
    if (!canTilt() || sheet.dataset.dragging !== undefined) {
      return;
    }

    const rect = sheet.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const px = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
    const py = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
    sheet.style.setProperty("--note-tilt-x", `${(-py * 4.5).toFixed(2)}deg`);
    sheet.style.setProperty("--note-tilt-y", `${(px * 5.5).toFixed(2)}deg`);
  };

  const commit = (index: number) => {
    if (count < 2 || index === front) {
      return;
    }

    const pile = pileRef.current;
    restoreFocus.current = pile?.contains(document.activeElement) ?? false;
    pile?.querySelectorAll<HTMLElement>(".testimonial-sheet").forEach((sheet) => {
      sheet.style.setProperty("transition", "none");
      sheet.style.removeProperty("--note-nudge");
      sheet.style.removeProperty("--note-tilt-x");
      sheet.style.removeProperty("--note-tilt-y");
      delete sheet.dataset.dragging;
    });
    requestAnimationFrame(() => {
      pile?.querySelectorAll<HTMLElement>(".testimonial-sheet").forEach((sheet) => {
        sheet.style.removeProperty("transition");
      });
    });

    const item = items[index];
    setFront(index);
    if (item) {
      setAnnouncement(`${item.author}. Note ${index + 1} of ${count}.`);
    }
  };

  const step = (direction: -1 | 1) => {
    commit((front + direction + count) % count);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement> | PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    const pile = pileRef.current;
    if (pile?.hasPointerCapture(event.pointerId)) {
      pile.releasePointerCapture(event.pointerId);
    }

    const sheet = frontSheet();
    const travel = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (
      drag.backIndex !== null &&
      !drag.active &&
      travel < START_PX &&
      Number.isInteger(drag.backIndex)
    ) {
      sheet?.style.removeProperty("--note-nudge");
      sheet?.style.removeProperty("--note-tilt-x");
      sheet?.style.removeProperty("--note-tilt-y");
      commit(drag.backIndex);
      return;
    }

    if (sheet) {
      delete sheet.dataset.dragging;
    }

    const releaseNudge = () => {
      if (!sheet) {
        return;
      }
      if (drag.active && !motionOff()) {
        sheet.style.setProperty("--note-nudge", "0px");
      } else {
        sheet.style.removeProperty("--note-nudge");
      }
      sheet.style.removeProperty("--note-tilt-x");
      sheet.style.removeProperty("--note-tilt-y");
    };

    if (!drag.active) {
      releaseNudge();
      return;
    }

    if (count > 1 && Math.abs(drag.dx) >= COMMIT_PX) {
      sheet?.style.removeProperty("--note-nudge");
      sheet?.style.removeProperty("--note-tilt-x");
      sheet?.style.removeProperty("--note-tilt-y");
      const next = drag.dx < 0 ? (front + 1) % count : (front - 1 + count) % count;
      commit(next);
      return;
    }

    releaseNudge();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("a, button")) {
      return;
    }

    const sheet = target.closest<HTMLElement>(".testimonial-sheet");
    if (!sheet || !pileRef.current?.contains(sheet)) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      active: false,
      fromText: Boolean(target.closest(".testimonial-quote")),
      backIndex: sheet.dataset.slot === "0" ? null : Number(sheet.dataset.index),
    };
    pileRef.current.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const sheet = frontSheet();
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      if (sheet && event.buttons === 0) {
        tilt(sheet, event);
      }
      return;
    }

    if (event.buttons === 0) {
      endDrag(event);
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.dx = dx;

    if (!drag.active) {
      if (Math.hypot(dx, dy) < START_PX) {
        if (sheet && drag.backIndex === null) {
          tilt(sheet, event);
        }
        return;
      }

      const horizontal = Math.abs(dx) > Math.abs(dy);
      const selectingText = drag.fromText && event.pointerType !== "touch";
      if (!horizontal || selectingText || drag.backIndex !== null) {
        dragRef.current = null;
        if (pileRef.current?.hasPointerCapture(event.pointerId)) {
          pileRef.current.releasePointerCapture(event.pointerId);
        }
        return;
      }

      drag.active = true;
      if (sheet) {
        sheet.dataset.dragging = "";
      }
    }

    if (sheet && !motionOff()) {
      const limit = nudgeLimit(pileRef.current, count);
      sheet.style.setProperty("--note-nudge", `${resist(dx, limit).toFixed(1)}px`);
    }
  };

  const onPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.active && dragRef.current.pointerId === event.pointerId) {
      return;
    }

    resetTilt();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (count < 2 || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <section
      id="notes"
      className="testimonials"
      aria-labelledby="notes-heading"
      aria-roledescription={count > 1 ? "carousel" : undefined}
      onKeyDown={onKeyDown}
    >
      <h2 id="notes-heading" className="work-section-title">
        Notes
      </h2>
      <div className="testimonial-deck">
        <div
          ref={pileRef}
          className="testimonial-pile"
          data-count={count}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={onPointerLeave}
        >
          {items.map((item, index) => {
            const slot = (index - front + count) % count;
            const far = slot > 2;
            return (
              <TestimonialSheet
                key={item.id}
                item={item}
                index={index}
                slot={far ? undefined : slot}
                far={far}
              />
            );
          })}
        </div>
        {count > 1 ? (
          <div className="testimonial-switches">
            <button type="button" onClick={() => step(-1)}>
              Previous note
            </button>
            <button type="button" onClick={() => step(1)}>
              Next note
            </button>
          </div>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

function TestimonialSheet({
  item,
  index,
  slot,
  far,
}: {
  item: Testimonial;
  index: number;
  slot: number | undefined;
  far: boolean;
}) {
  const front = slot === 0;
  return (
    <article
      className="testimonial-sheet"
      data-slot={slot}
      data-far={far ? "" : undefined}
      data-index={index}
      aria-hidden={front ? undefined : true}
    >
      <blockquote className="testimonial-quote">
        <p>{item.quote}</p>
      </blockquote>
      <footer className="testimonial-byline">
        {item.href ? (
          <a
            className="testimonial-author"
            href={item.href}
            rel="noreferrer"
            target="_blank"
            tabIndex={front ? undefined : -1}
          >
            {item.author}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <p className="testimonial-author">{item.author}</p>
        )}
        <p className="testimonial-role">{item.role}</p>
        {item.context ? <p className="testimonial-context">{item.context}</p> : null}
      </footer>
    </article>
  );
}
