"use client";

import Image from "next/image";
import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { LogoBand, LogoItem } from "@/lib/logos";

const DRAG_THRESHOLD_PX = 8;

type LogoRowsProps = {
  bands: LogoBand[];
  heading?: string;
  id?: string;
};

export function LogoRows({ bands, heading = "Brands", id = "logos" }: LogoRowsProps) {
  const headingId = `${id}-heading`;
  const total = bands.reduce((count, band) => count + band.items.length, 0);

  if (total === 0) {
    return null;
  }

  const items = bands.flatMap((band) => band.items);

  return (
    <section id={id} className="logo-section" aria-labelledby={headingId}>
      <div className="work-section-head">
        <h2 id={headingId} className="work-section-title">
          {heading}
        </h2>
        <span className="work-count">{bands[0]?.label}</span>
      </div>
      <LogoTrack items={items} label={heading} />
    </section>
  );
}

function LogoTrack({ items, label }: { items: LogoItem[]; label: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startLeft: number;
    distance: number;
  } | null>(null);

  const step = useCallback((direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    const cards = [...node.querySelectorAll<HTMLElement>(".logo-card")];
    if (cards.length === 0) {
      return;
    }

    const origin = cards[0].offsetLeft;
    const current = node.scrollLeft;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";

    if (direction === 1) {
      const next = cards.find((card) => card.offsetLeft - origin > current + 8);
      node.scrollTo({
        left: next ? next.offsetLeft - origin : node.scrollWidth,
        behavior,
      });
      return;
    }

    const previous = [...cards]
      .reverse()
      .find((card) => card.offsetLeft - origin < current - 8);
    node.scrollTo({
      left: previous ? previous.offsetLeft - origin : 0,
      behavior,
    });
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return;
    }

    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startLeft: node.scrollLeft,
      distance: 0,
    };
    node.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const node = scrollerRef.current;
    if (!drag || !node || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    drag.distance = Math.abs(deltaX);

    if (drag.distance < DRAG_THRESHOLD_PX) {
      return;
    }

    node.dataset.dragging = "";
    node.scrollLeft = drag.startLeft - deltaX;
  }, []);

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const node = scrollerRef.current;
    if (!drag || !node || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    delete node.dataset.dragging;
    if (node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    },
    [step],
  );

  return (
    <div className="work-track-fade">
      <div
        ref={scrollerRef}
        className="work-track logo-track"
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => (
          <LogoCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function LogoCard({ item }: { item: LogoItem }) {
  return (
    <figure className="logo-card">
      <span className="logo-card-frame">
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes="(max-width: 767px) calc(100vw - 48px), 336px"
          className="logo-card-image"
          draggable={false}
        />
      </span>
    </figure>
  );
}
