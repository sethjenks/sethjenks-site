"use client";

import { CollapseIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { AppIcon } from "@/components/app-icon";
import { imageLayer } from "@/components/board/card-media";
import type { PresentationSpec, PresentationTile } from "@/components/board/presentations/types";

const HISTORY_KEY = "boardPhoneSheet";
const CLOSE_MS = 160;
const EAGER_SPAN = 1;
const SRC_SPAN = 2;

// Survives React strict-mode remounts so a dev double-invoke pushes one entry.
let historyOwner: object | null = null;

type PhoneSheetProps = {
  spec: PresentationSpec;
  heldSelector: string;
  className?: string;
  onExited: () => void;
};

export function PhoneSheet({ spec, heldSelector, className, onExited }: PhoneSheetProps) {
  const tiles = spec.tiles;
  const start = Math.max(0, tiles.findIndex((tile) => tile.resting));
  const [index, setIndex] = useState(start);
  const [closing, setClosing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const dismissRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const onExitedRef = useRef(onExited);
  const indexRef = useRef(start);

  useEffect(() => {
    onExitedRef.current = onExited;
  });

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const slide = track?.querySelector<HTMLElement>(`[data-slide="${start}"]`);
    if (track && slide) {
      track.scrollLeft = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    }
    doneRef.current?.focus();
  }, [start]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    let frame = 0;
    const readIndex = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = indexRef.current;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const child of track.querySelectorAll<HTMLElement>("[data-slide]")) {
        const childMid = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(childMid - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = Number(child.dataset.slide);
        }
      }
      setIndex((current) => (current === best ? current : best));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(readIndex);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const track = trackRef.current;
      const slide = track?.querySelector<HTMLElement>(`[data-slide="${indexRef.current}"]`);
      if (!track || !slide) {
        return;
      }
      track.scrollLeft = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content");
    meta?.setAttribute("content", "#ededed");

    const me = {};
    if (historyOwner === null) {
      history.pushState({ [HISTORY_KEY]: true }, "");
    }
    historyOwner = me;

    const finish = () => {
      if (closingRef.current) {
        return;
      }
      closingRef.current = true;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        onExitedRef.current();
        restoreFocus(heldSelector);
        return;
      }
      setClosing(true);
      window.setTimeout(() => {
        onExitedRef.current();
        restoreFocus(heldSelector);
      }, CLOSE_MS);
    };
    finishRef.current = finish;

    const onPop = () => {
      if (historyOwner !== me) {
        return;
      }
      historyOwner = null;
      dismissRef.current = true;
      finish();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }
      event.preventDefault();
      if (history.state?.[HISTORY_KEY]) {
        history.back();
        return;
      }
      finish();
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey, true);

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey, true);
      if (previous != null) {
        meta?.setAttribute("content", previous);
      }
      queueMicrotask(() => {
        if (historyOwner !== me) {
          return;
        }
        historyOwner = null;
        if (history.state?.[HISTORY_KEY]) {
          history.back();
        }
      });
    };
  }, [heldSelector]);

  const requestClose = () => {
    if (dismissRef.current) {
      return;
    }
    dismissRef.current = true;
    if (history.state?.[HISTORY_KEY]) {
      history.back();
      return;
    }
    finishRef.current();
  };

  const step = (direction: -1 | 1) => {
    const track = trackRef.current;
    const next = track?.querySelector<HTMLElement>(`[data-slide="${index + direction}"]`);
    if (!track || !next) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = next.offsetLeft - (track.clientWidth - next.offsetWidth) / 2;
    track.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  };

  const few = tiles.length <= 8;
  const active = tiles[index] ?? tiles[start];
  const resting = tiles[start] ?? tiles[0];
  const sheetClass = className ? `phone-sheet ${className}` : "phone-sheet";

  return createPortal(
    <div
      className={sheetClass}
      role="dialog"
      aria-modal="true"
      aria-label={spec.project.title}
      data-closing={closing ? "" : undefined}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        }
      }}
    >
      <div className="phone-sheet-bar">
        <p className="phone-sheet-count" aria-live="polite" aria-atomic="true">
          {few ? (
            <SheetDots count={tiles.length} index={index} />
          ) : (
            <span className="card-open-header-chip">
              {index + 1} / {tiles.length}
            </span>
          )}
        </p>
        <button
          ref={doneRef}
          type="button"
          className="card-open-header-collapse"
          aria-label="Collapse"
          onClick={(event) => {
            event.stopPropagation();
            requestClose();
          }}
        >
          <HugeiconsIcon icon={CollapseIcon} size={24} strokeWidth={2} color="currentColor" />
        </button>
      </div>
      <div className="phone-sheet-view">
      <div
        ref={trackRef}
        className="phone-sheet-track"
        style={{ "--sheet-aspect": frameAspect(resting) } as CSSProperties}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={spec.project.title}
      >
        <div className="phone-sheet-pad" aria-hidden="true" />
        {tiles.map((tile, tileIndex) => (
          <SheetSlide
            key={tile.id}
            tile={tile}
            kind={spec.id}
            tileIndex={tileIndex}
            count={tiles.length}
            active={tileIndex === index}
            distance={Math.abs(tileIndex - index)}
          />
        ))}
        <div className="phone-sheet-pad" aria-hidden="true" />
      </div>
      </div>
      <div className="phone-sheet-caption">
        <p className="phone-sheet-label">{active.label}</p>
        <p className="phone-sheet-description">{active.description}</p>
      </div>
    </div>,
    document.body,
  );
}

function frameAspect(tile: PresentationTile) {
  return `${tile.width} / ${tile.height}`;
}

function SheetSlide({
  tile,
  kind,
  tileIndex,
  count,
  active,
  distance,
}: {
  tile: PresentationTile;
  kind: PresentationSpec["id"];
  tileIndex: number;
  count: number;
  active: boolean;
  distance: number;
}) {
  const src = imageLayer(tile.media)?.src ?? tile.image;
  const show = distance <= SRC_SPAN;
  const eager = distance <= EAGER_SPAN;

  return (
    <div
      className="phone-sheet-slide"
      data-slide={tileIndex}
      style={{ "--frame-aspect": frameAspect(tile) } as CSSProperties}
      role="group"
      aria-roledescription="slide"
      aria-label={`${tileIndex + 1} of ${count}, ${tile.label}`}
      aria-hidden={active ? undefined : true}
    >
      <div
        className="phone-sheet-frame"
        data-icon={tile.icon ? "" : undefined}
        data-kind={kind}
        style={tile.icon || kind === "phone" ? undefined : { borderRadius: tile.radius }}
      >
        {tile.icon ? (
          <AppIcon mark={tile.icon.mark} rounded={tile.icon.rounded} />
        ) : show && src ? (
          // Screenshots are fixed assets. Native img keeps lazy loading on the pager.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            decoding="async"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={active ? "high" : "low"}
            sizes="84vw"
          />
        ) : null}
      </div>
    </div>
  );
}

function SheetDots({ count, index }: { count: number; index: number }) {
  return (
    <span className="phone-sheet-dots">
      {Array.from({ length: count }, (_, dot) => (
        <span key={dot} className="phone-sheet-dot" data-on={dot === index ? "" : undefined} />
      ))}
    </span>
  );
}

function restoreFocus(selector: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(selector)?.focus();
  });
}
