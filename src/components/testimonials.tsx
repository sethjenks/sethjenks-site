"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Testimonial } from "@/lib/testimonials";

const BUBBLE = 80;
const GAP = 14;
const TOUCH_GUARD_MS = 700;

const SPOTS: ReadonlyArray<{ fx: number; y: number }> = [
  { fx: 0.02, y: 20 },
  { fx: 0.72, y: 16 },
  { fx: 0.34, y: 112 },
  { fx: 0.64, y: 128 },
  { fx: 0.1, y: 150 },
  { fx: 0.46, y: 64 },
  { fx: 0.2, y: 190 },
  { fx: 0.78, y: 198 },
];

type Side = "left" | "right";

type NoteStyle = CSSProperties & {
  "--room": string;
  "--drift-x": string;
  "--drift-y": string;
  "--drift-dur": string;
  "--drift-delay": string;
};

function spotFor(index: number): { fx: number; y: number } {
  const spot = SPOTS[index % SPOTS.length];
  const lap = Math.floor(index / SPOTS.length);
  return { fx: spot.fx, y: spot.y + lap * 56 };
}

function placeX(fx: number, fieldWidth: number): number {
  if (fieldWidth <= 0) return 0;
  const max = Math.max(0, fieldWidth - BUBBLE);
  return Math.round(Math.min(Math.max(fx * fieldWidth, 0), max));
}

function Note({
  item,
  index,
  fieldWidth,
  open,
  onOpen,
  onClose,
  onToggle,
  onLeave,
  hoverAllowed,
}: {
  item: Testimonial;
  index: number;
  fieldWidth: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onLeave: () => void;
  hoverAllowed: () => boolean;
}) {
  const panelId = useId();
  const openedAt = useRef(0);
  const { fx, y } = spotFor(index);
  const x = placeX(fx, fieldWidth);
  const roomRight = Math.max(0, fieldWidth - x - BUBBLE);
  const side: Side = roomRight >= x ? "right" : "left";
  const room = fieldWidth <= 0 ? BUBBLE : side === "right" ? Math.max(BUBBLE, fieldWidth - x) : x + BUBBLE;
  const driftInward = fx > 0.55;
  const roleLine = item.context ? `${item.role}, ${item.context}` : item.role;
  const style: NoteStyle = {
    insetBlockStart: y,
    insetInlineStart: side === "right" ? x : "auto",
    insetInlineEnd: side === "left" ? Math.max(0, fieldWidth - x - BUBBLE) : "auto",
    "--room": `${room}px`,
    "--drift-x": driftInward ? "-5px" : "4px",
    "--drift-y": index % 2 === 0 ? "-5px" : "4px",
    "--drift-dur": `${8.6 + (index % 5) * 0.7}s`,
    "--drift-delay": `${-(index % 8) * 0.85}s`,
  };

  const onPointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !hoverAllowed()) return;
    if (!open) openedAt.current = performance.now();
    onOpen();
  };

  const onPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !hoverAllowed()) return;
    if (event.buttons !== 0) return;
    onLeave();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    if (event.currentTarget.contains(next)) return;
    onClose();
  };

  return (
    <div
      className="testimonial-note"
      data-note={item.id}
      data-open={open ? "true" : "false"}
      data-side={side}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={onBlur}
    >
      <div className="note-float">
        <button
          type="button"
          className="note-bubble"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${item.author}, ${roleLine}`}
          onClick={() => {
            if (open && performance.now() - openedAt.current < 320) return;
            onToggle();
          }}
        />
      </div>
      <div className="note-panel" id={panelId} hidden={!open}>
        <p className="note-name">
          {item.href ? (
            <a href={item.href} rel="noreferrer" target="_blank">
              {item.author}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            item.author
          )}
        </p>
        <p className="note-role">{item.role}</p>
        {item.context ? <p className="note-role">{item.context}</p> : null}
        <blockquote className="note-quote">
          <p>{item.quote}</p>
        </blockquote>
      </div>
    </div>
  );
}

export function Testimonials({ items }: { items: readonly Testimonial[] }) {
  const headingId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fieldWidth, setFieldWidth] = useState(0);
  const held = useRef<string | null>(null);
  const fine = useRef(false);
  const touchedAt = useRef(0);

  const hoverAllowed = () => fine.current && Date.now() - touchedAt.current > TOUCH_GUARD_MS;

  useLayoutEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      fine.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const measure = () => setFieldWidth(field.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const notes = [...field.querySelectorAll<HTMLElement>(".testimonial-note")];
    const open = notes.find((note) => note.dataset.open === "true") ?? null;
    const push = new Map<HTMLElement, number>();

    if (open) {
      const openBox = {
        left: open.offsetLeft,
        top: open.offsetTop,
        right: open.offsetLeft + open.offsetWidth,
        bottom: open.offsetTop + open.offsetHeight,
      };

      for (const note of notes) {
        if (note === open) continue;
        const top = note.offsetTop;
        const left = note.offsetLeft;
        const right = left + BUBBLE;
        const bottom = top + BUBBLE;
        const hits =
          left < openBox.right + GAP &&
          right > openBox.left - GAP &&
          top < openBox.bottom + GAP &&
          bottom > openBox.top - GAP;
        if (!hits) continue;
        push.set(note, Math.max(0, openBox.bottom + GAP - top));
      }

      const resting = notes
        .filter((note) => note !== open)
        .sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft);

      for (let i = 0; i < resting.length; i += 1) {
        const bubble = resting[i];
        const top = bubble.offsetTop + (push.get(bubble) ?? 0);
        const left = bubble.offsetLeft;
        for (let j = 0; j < i; j += 1) {
          const other = resting[j];
          const otherTop = other.offsetTop + (push.get(other) ?? 0);
          const otherLeft = other.offsetLeft;
          const overlapX = left < otherLeft + BUBBLE + 8 && left + BUBBLE + 8 > otherLeft;
          const overlapY = top < otherTop + BUBBLE + 8 && top + BUBBLE + 8 > otherTop;
          if (!overlapX || !overlapY) continue;
          const next = otherTop + BUBBLE + 8 - bubble.offsetTop;
          if (next > (push.get(bubble) ?? 0)) push.set(bubble, next);
        }
      }
    }

    for (const note of notes) {
      const next = push.get(note);
      if (next === undefined) note.style.removeProperty("--push-y");
      else note.style.setProperty("--push-y", `${next}px`);
    }

    let lowest = 20 + BUBBLE + 28;
    for (const note of notes) {
      const extra = push.get(note) ?? 0;
      const height = note === open ? note.offsetHeight : BUBBLE;
      lowest = Math.max(lowest, note.offsetTop + extra + height + 16);
    }
    field.style.minBlockSize = `${lowest}px`;
  }, [openId, fieldWidth, items]);

  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") touchedAt.current = Date.now();
      const note = fieldRef.current?.querySelector<HTMLElement>(`[data-note="${CSS.escape(openId)}"]`);
      if (note && event.target instanceof Node && note.contains(event.target)) return;
      held.current = null;
      setOpenId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const note = fieldRef.current?.querySelector<HTMLElement>(`[data-note="${CSS.escape(openId)}"]`);
      const returnFocus = note?.contains(document.activeElement) ?? false;
      held.current = null;
      setOpenId(null);
      if (returnFocus) note?.querySelector<HTMLButtonElement>("button.note-bubble")?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  if (items.length === 0) return null;

  return (
    <section
      className="testimonials"
      aria-labelledby={headingId}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") touchedAt.current = Date.now();
      }}
    >
      <h2 id={headingId} className="sr-only">
        Notes
      </h2>
      <div className="note-field" ref={fieldRef}>
        {items.map((item, index) => (
          <Note
            key={item.id}
            item={item}
            index={index}
            fieldWidth={fieldWidth}
            open={openId === item.id}
            hoverAllowed={hoverAllowed}
            onOpen={() => {
              if (held.current === item.id) return;
              held.current = null;
              setOpenId(item.id);
            }}
            onClose={() => {
              setOpenId((current) => (current === item.id ? null : current));
            }}
            onToggle={() => {
              setOpenId((current) => {
                if (current === item.id) {
                  held.current = item.id;
                  return null;
                }
                held.current = null;
                return item.id;
              });
            }}
            onLeave={() => {
              held.current = null;
              setOpenId((current) => (current === item.id ? null : current));
            }}
          />
        ))}
      </div>
    </section>
  );
}
