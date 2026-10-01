"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { WorkBand, WorkItem } from "@/lib/work";

const DRAG_THRESHOLD_PX = 8;

const OBJECT_POSITION: Record<string, string> = {
  intermission: "center top",
  "boardwalk-bots": "center top",
  offramp: "center center",
  "brand-brand": "center top",
  "food-passport": "center center",
  "philo-shirt": "center center",
  "level-hardscapes": "center center",
};

function padCount(count: number): string {
  return String(count).padStart(2, "0");
}

function objectPositionFor(id: string): string {
  return OBJECT_POSITION[id] ?? "center top";
}

type WorkRowsProps = {
  bands: WorkBand[];
  heading?: string;
  id?: string;
};

export function WorkRows({ bands, heading = "Work", id = "work" }: WorkRowsProps) {
  const headingId = `${id}-heading`;
  const total = bands.reduce((count, band) => count + band.items.length, 0);

  if (total === 0) {
    return null;
  }

  const multi = bands.length > 1;

  return (
    <section
      id={id}
      className={multi ? "work-section" : "work-section work-section-solo"}
      aria-labelledby={headingId}
    >
      <div className="work-section-head">
        <h2 id={headingId} className="work-section-title">
          {heading}
        </h2>
        <span className="work-count">{padCount(total)}</span>
      </div>
      {bands.map((band) => (
        <WorkTrack key={band.id} band={band} showLabel={multi} />
      ))}
    </section>
  );
}

function WorkTrack({ band, showLabel }: { band: WorkBand; showLabel: boolean }) {
  const labelId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startLeft: number;
    distance: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncEnds = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    setCanPrev(node.scrollLeft > 4);
    setCanNext(node.scrollLeft + node.clientWidth < node.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    node.scrollLeft = 0;
    syncEnds();
    node.addEventListener("scroll", syncEnds, { passive: true });
    window.addEventListener("resize", syncEnds);

    return () => {
      node.removeEventListener("scroll", syncEnds);
      window.removeEventListener("resize", syncEnds);
    };
  }, [syncEnds, band.items]);

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
    <div className="work-band">
      <div className={showLabel ? "work-band-header" : "work-band-controls-row"}>
        {showLabel ? (
          <>
            <h3 id={labelId} className="work-band-label">
              {band.label}
            </h3>
            <span className="work-count">{padCount(band.items.length)}</span>
          </>
        ) : null}
        <div className="work-band-controls">
          <button
            type="button"
            className="work-nav-button"
            aria-label={`Previous ${band.label}`}
            disabled={!canPrev}
            onClick={() => step(-1)}
          >
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="work-nav-button"
            aria-label={`Next ${band.label}`}
            disabled={!canNext}
            onClick={() => step(1)}
          >
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="work-track-fade">
        <div
          ref={scrollerRef}
          className="work-track"
          role="region"
          aria-label={band.label}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          {band.items.map((item, index) => (
            <WorkCard
              key={item.id}
              item={item}
              priority={index < 2}
              onClick={onItemClick}
            />
          ))}
        </div>
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
  return (
    <Link
      href={`/work/${item.id}`}
      className="work-card"
      onClick={onClick}
      draggable={false}
    >
      <span className="work-card-frame">
        <Image
          src={item.src}
          alt=""
          fill
          sizes="(max-width: 767px) calc(100vw - 48px), 480px"
          priority={priority}
          className="work-card-image"
          style={{ objectPosition: objectPositionFor(item.id) }}
          draggable={false}
        />
        <span className="work-card-verb">
          Read
          <ChevronRight aria-hidden="true" size={12} strokeWidth={1.5} />
        </span>
      </span>
      <span className="work-card-meta">
        <span className="work-card-title">{item.title}</span>
        <span className="work-card-type">{item.role}</span>
      </span>
    </Link>
  );
}
