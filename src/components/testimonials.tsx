"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import type { Testimonial } from "@/lib/testimonials";

const BUBBLE = 80;
const COUNT = 7;
const BAND = 120;
const GAP_S = 3;
const TOUCH_GUARD_MS = 700;

type Side = "left" | "right";

type BubbleSlot = {
  key: string;
  item: Testimonial | null;
};

type Mover = {
  x: number;
  y: number;
  speed: number;
  wait: number;
};

function slotsFor(items: readonly Testimonial[]): BubbleSlot[] {
  const real = items.slice(0, COUNT).map((item) => ({ key: item.id, item }));
  const empty: BubbleSlot[] = [];
  for (let index = real.length; index < COUNT; index += 1) {
    empty.push({ key: `glass-${index}`, item: null });
  }
  return [...real, ...empty];
}

function staggerYs(count: number): number[] {
  const step = BAND / Math.max(1, count - 1);
  const ys = Array.from({ length: count }, (_, index) => {
    const jitter = (Math.random() - 0.5) * 18;
    return Math.min(BAND, Math.max(0, index * step + jitter));
  });
  for (let index = ys.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = ys[index];
    const other = ys[swap];
    if (current === undefined || other === undefined) continue;
    ys[index] = other;
    ys[swap] = current;
  }
  return ys;
}

function edgeFade(x: number, width: number): number {
  const enter = (width - x) / BUBBLE;
  const exit = (x + BUBBLE) / BUBBLE;
  return Math.min(1, Math.max(0, Math.min(enter, exit)));
}

function stepMover(mover: Mover, width: number, dt: number) {
  if (mover.wait > 0) {
    mover.wait -= dt;
    if (mover.wait <= 0) {
      mover.wait = 0;
      mover.x = width;
    }
    return;
  }
  mover.x -= mover.speed * dt;
  if (mover.x + BUBBLE <= 0) {
    mover.wait = GAP_S;
    mover.x = -BUBBLE;
  }
}

function paintMover(el: HTMLElement, mover: Mover, width: number, paused: boolean) {
  const fade = edgeFade(mover.x, width);
  el.style.transform = `translate3d(${mover.x}px, ${mover.y}px, 0)`;
  el.style.opacity = String(fade);
  el.style.pointerEvents = paused || fade > 0 ? "" : "none";
}

export function Testimonials({ items }: { items: readonly Testimonial[] }) {
  const headingId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const noteEls = useRef<(HTMLDivElement | null)[]>([]);
  const movers = useRef<Mover[]>([]);
  const openIdRef = useRef<string | null>(null);
  const reducedRef = useRef(false);
  const held = useRef<string | null>(null);
  const fine = useRef(false);
  const touchedAt = useRef(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [side, setSide] = useState<Side>("right");

  const slots = items.length === 0 ? [] : slotsFor(items);
  const itemKey = items.map((item) => item.id).join("|");
  openIdRef.current = openId;

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
    if (!field || noteEls.current.length === 0) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const count = noteEls.current.length;
    const width = field.clientWidth;
    const ys = staggerYs(count);
    movers.current = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * Math.max(1, width - BUBBLE),
      y: ys[index] ?? 0,
      speed: Math.max(width, 1) / (18 + Math.random() * 10),
      wait: 0,
    }));
    reducedRef.current = reduceQuery.matches;

    const paintAll = () => {
      const nextWidth = field.clientWidth;
      const open = openIdRef.current;
      for (let index = 0; index < movers.current.length; index += 1) {
        const el = noteEls.current[index];
        const mover = movers.current[index];
        if (!el || !mover) continue;
        paintMover(el, mover, nextWidth, el.dataset.note === open);
      }
    };

    paintAll();

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden && !reducedRef.current) {
        const nextWidth = field.clientWidth;
        const open = openIdRef.current;
        for (let index = 0; index < movers.current.length; index += 1) {
          const el = noteEls.current[index];
          const mover = movers.current[index];
          if (!el || !mover) continue;
          if (el.dataset.note && el.dataset.note === open) continue;
          stepMover(mover, nextWidth, dt);
        }
      }
      paintAll();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf !== 0 || reducedRef.current) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onReduce = () => {
      reducedRef.current = reduceQuery.matches;
      if (reduceQuery.matches) stop();
      else start();
      paintAll();
    };

    reduceQuery.addEventListener("change", onReduce);
    start();

    return () => {
      stop();
      reduceQuery.removeEventListener("change", onReduce);
    };
  }, [itemKey]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (!openId) {
      field.style.removeProperty("min-block-size");
      return;
    }
    const panel = field.querySelector<HTMLElement>(".note-panel:not([hidden])");
    if (!panel) return;
    const needed = panel.getBoundingClientRect().bottom - field.getBoundingClientRect().top + 24;
    field.style.minBlockSize = `${Math.max(BAND + BUBBLE, needed)}px`;
  }, [openId, side]);

  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") touchedAt.current = Date.now();
      const note = fieldRef.current?.querySelector<HTMLElement>(`[data-note="${CSS.escape(openId)}"]`);
      if (note && event.target instanceof Node && note.contains(event.target)) return;
      held.current = null;
      openIdRef.current = null;
      setOpenId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const note = fieldRef.current?.querySelector<HTMLElement>(`[data-note="${CSS.escape(openId)}"]`);
      const returnFocus = note?.contains(document.activeElement) ?? false;
      held.current = null;
      openIdRef.current = null;
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

  if (slots.length === 0) return null;

  const placeOpen = (index: number) => {
    const mover = movers.current[index];
    const width = fieldRef.current?.clientWidth ?? 0;
    const x = mover?.x ?? 0;
    const roomRight = Math.max(0, width - x - BUBBLE);
    const nextSide: Side = roomRight >= x ? "right" : "left";
    const space = Math.max(180, (nextSide === "right" ? roomRight : x) - 28);
    const el = noteEls.current[index];
    el?.style.setProperty("--room", `${space}px`);
    setSide(nextSide);
  };

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
        {slots.map((slot, index) => {
          const item = slot.item;
          const open = item !== null && openId === item.id;
          return (
            <Bubble
              key={slot.key}
              item={item}
              open={open}
              side={open ? side : "right"}
              noteRef={(node) => {
                noteEls.current[index] = node;
              }}
              hoverAllowed={hoverAllowed}
              onOpen={() => {
                if (!item || held.current === item.id) return;
                held.current = null;
                openIdRef.current = item.id;
                placeOpen(index);
                setOpenId(item.id);
              }}
              onClose={() => {
                if (!item || openIdRef.current !== item.id) return;
                openIdRef.current = null;
                setOpenId(null);
              }}
              onToggle={() => {
                if (!item) return;
                if (openIdRef.current === item.id) {
                  held.current = item.id;
                  openIdRef.current = null;
                  setOpenId(null);
                  return;
                }
                held.current = null;
                openIdRef.current = item.id;
                placeOpen(index);
                setOpenId(item.id);
              }}
              onLeave={() => {
                if (!item || openIdRef.current !== item.id) return;
                held.current = null;
                openIdRef.current = null;
                setOpenId(null);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function Bubble({
  item,
  open,
  side,
  noteRef,
  hoverAllowed,
  onOpen,
  onClose,
  onToggle,
  onLeave,
}: {
  item: Testimonial | null;
  open: boolean;
  side: Side;
  noteRef: (node: HTMLDivElement | null) => void;
  hoverAllowed: () => boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onLeave: () => void;
}) {
  const panelId = useId();
  const openedAt = useRef(0);
  const roleLine = item ? (item.context ? `${item.role}, ${item.context}` : item.role) : "";

  const onPointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!item || event.pointerType !== "mouse" || !hoverAllowed()) return;
    if (!open) openedAt.current = performance.now();
    onOpen();
  };

  const onPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!item || event.pointerType !== "mouse" || !hoverAllowed()) return;
    if (event.buttons !== 0) return;
    onLeave();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!item) return;
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    if (event.currentTarget.contains(next)) return;
    onClose();
  };

  return (
    <div
      ref={noteRef}
      className="testimonial-note"
      data-note={item?.id}
      data-open={open ? "true" : "false"}
      data-side={side}
      aria-hidden={item ? undefined : true}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={onBlur}
    >
      {item ? (
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
        >
          {item.portrait ? (
            <Image className="note-portrait" src={item.portrait} alt="" fill sizes="80px" quality={90} />
          ) : null}
        </button>
      ) : (
        <div className="note-bubble" />
      )}
      {item ? (
        <div className="note-panel" id={panelId} hidden={!open} data-side={side}>
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
      ) : null}
    </div>
  );
}
