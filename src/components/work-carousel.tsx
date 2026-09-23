"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { WorkItem } from "@/lib/work";

const DRAG_THRESHOLD_PX = 8;

type WorkCarouselProps = {
  items: WorkItem[];
  heading?: string;
  id?: string;
};

export function WorkCarousel({
  items,
  heading = "Design work",
  id,
}: WorkCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startLeft: number;
    distance: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) {
      node.scrollLeft = 0;
    }
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

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    const step = Math.round(node.clientWidth * 0.72);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior = reducedMotion ? "auto" : "smooth";

    if (event.key === "ArrowRight") {
      event.preventDefault();
      node.scrollBy({ left: step, behavior });
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      node.scrollBy({ left: -step, behavior });
    }
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      id={id}
      className="work-carousel"
      aria-labelledby="work-carousel-heading"
    >
      <h2
        id="work-carousel-heading"
        className={
          heading === "Design work"
            ? "sr-only"
            : "work-carousel-heading"
        }
      >
        {heading}
      </h2>
      <div className="work-carousel-fade">
        <div
          ref={scrollerRef}
          className="work-carousel-track"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/work/${item.id}`}
              className="work-carousel-card"
              onClick={onItemClick}
              draggable={false}
            >
              <span
                className="work-carousel-item"
                style={{ aspectRatio: `${item.width} / ${item.height}` }}
              >
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 80vw, 45rem"
                  priority={index < 2}
                  className="work-carousel-image"
                  draggable={false}
                />
              </span>
              <span className="work-carousel-meta">
                <span className="work-carousel-title">{item.title}</span>
                <span className="work-carousel-role">{item.role}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
