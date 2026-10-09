"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { WorkItem } from "@/lib/work";
import { isMobileScreen } from "@/lib/work-shape";

const DRAG_THRESHOLD_PX = 8;

const OBJECT_POSITION: Record<string, string> = {
  "offer-builder": "center center",
  "chia-signer": "center center",
  "chia-wallet": "center center",
  "chia-friends": "center center",
};

function objectPositionFor(id: string): string {
  return OBJECT_POSITION[id] ?? "center top";
}

type WorkRowsProps = {
  items: WorkItem[];
  heading?: string;
  id?: string;
};

export function WorkRows({ items, heading = "Work", id = "work" }: WorkRowsProps) {
  const headingId = `${id}-heading`;

  if (items.length === 0) {
    return null;
  }

  return (
    <section id={id} className="work-section" aria-labelledby={headingId}>
      <div className="work-section-head">
        <h2 id={headingId} className="work-section-title">
          {heading}
        </h2>
      </div>
      <WorkTrack items={items} label={heading} />
    </section>
  );
}

function WorkTrack({ items, label }: { items: WorkItem[]; label: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startLeft: number;
    distance: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const step = useCallback((direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    const cards = [...node.querySelectorAll<HTMLElement>(".work-card")];
    if (cards.length === 0) {
      return;
    }

    const origin = cards[0].offsetLeft;
    const current = node.scrollLeft;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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

    suppressClickRef.current = false;
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

    suppressClickRef.current = true;
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

  const onItemClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
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
        className="work-track"
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {items.map((item, index) => (
          <WorkCard
            key={item.id}
            item={item}
            priority={index < 2}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

function WorkCard({
  item,
  priority,
  onClick,
}: {
  item: WorkItem;
  priority: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const canvas = isMobileScreen(item);

  return (
    <Link
      href={`/work/${item.id}`}
      className="work-card"
      onClick={onClick}
      draggable={false}
    >
      <span className="work-card-frame" data-canvas={canvas ? "phone" : undefined}>
        <Image
          src={item.src}
          alt=""
          fill
          sizes="(max-width: 767px) calc(100vw - 48px), 480px"
          priority={priority}
          className="work-card-image"
          style={{ objectPosition: canvas ? "center" : objectPositionFor(item.id) }}
          draggable={false}
        />
        <span className="work-card-verb">
          Read
          <ChevronRight aria-hidden="true" strokeWidth={1.5} />
        </span>
      </span>
      <span className="work-card-meta">
        <span className="work-card-title">{item.title}</span>
        <span className="work-card-type">{item.role}</span>
      </span>
    </Link>
  );
}
