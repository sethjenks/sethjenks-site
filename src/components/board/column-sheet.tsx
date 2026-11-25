"use client";

import { CollapseIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { AppIcon } from "@/components/app-icon";
import { embedLayer, imageLayer, videoLayer } from "@/components/board/card-media";
import { CommandKey } from "@/components/board/command-key";
import { COMMAND_KEY_SRC } from "@/components/board/presentations/key-object";
import type { PresentationSpec, PresentationTile } from "@/components/board/presentations/types";
import { collectionIsPixelated, openCollection, type CollectionCatalog } from "@/lib/collections";

const HISTORY_KEY = "boardColumnSheet";
const CLOSE_MS = 160;
const OVERSCAN = 3;
const CAPTION_BLOCK = 96;

// Survives React strict-mode remounts so a dev double-invoke pushes one entry.
let historyOwner: object | null = null;

type ColumnSheetProps = {
  spec: PresentationSpec;
  heldSelector: string;
  className?: string;
  onExited: () => void;
};

export function ColumnSheet({ spec, heldSelector, className, onExited }: ColumnSheetProps) {
  const [closing, setClosing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const dismissRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const onExitedRef = useRef(onExited);

  useEffect(() => {
    onExitedRef.current = onExited;
  });

  useLayoutEffect(() => {
    doneRef.current?.focus();
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

  const sheetClass = className ? `column-sheet ${className}` : "column-sheet";
  const collection = spec.collection;

  return createPortal(
    <div
      className={sheetClass}
      role="dialog"
      aria-modal="true"
      aria-label={spec.project.title}
      data-closing={closing ? "" : undefined}
    >
      <div className="column-sheet-bar">
        <p className="column-sheet-title">{spec.project.title}</p>
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
      <div ref={trackRef} className="column-sheet-track">
        {collection ? (
          <CollectionWindow
            trackRef={trackRef}
            id={collection.id}
            poster={collection.poster}
            title={collection.title}
          />
        ) : (
          spec.tiles.map((tile, index) => <ColumnRow key={tile.id} tile={tile} eager={index < 2} />)
        )}
      </div>
    </div>,
    document.body,
  );
}

function ColumnRow({ tile, eager }: { tile: PresentationTile; eager: boolean }) {
  if (tile.copy) {
    return (
      <article className="column-sheet-row column-sheet-copy">
        {tile.copy.title ? <h2 className="column-sheet-copy-title">{tile.copy.title}</h2> : null}
        <p className="column-sheet-copy-body">{tile.copy.body}</p>
      </article>
    );
  }

  const embed = embedLayer(tile.media);
  const video = videoLayer(tile.media);
  const image = imageLayer(tile.media);
  const src = image?.src ?? tile.image;
  const aspect = frameAspect(tile);

  return (
    <article className="column-sheet-row">
      <div className="column-sheet-frame" style={aspect ? { aspectRatio: aspect } : undefined}>
        {embed?.src === COMMAND_KEY_SRC ? (
          <CommandKey interactive />
        ) : tile.icon ? (
          <span className="column-sheet-icon">
            <AppIcon mark={tile.icon.mark} rounded={tile.icon.rounded} />
          </span>
        ) : video ? (
          <video src={video.src} poster={video.poster} muted playsInline controls preload="metadata" />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            decoding="async"
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 752px) 720px, calc(100vw - 32px)"
          />
        ) : null}
      </div>
      <RowCaption label={tile.label} description={tile.description} />
    </article>
  );
}

function CollectionWindow({
  trackRef,
  id,
  poster,
  title,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  id: NonNullable<PresentationSpec["collection"]>["id"];
  poster: string;
  title: string;
}) {
  const [catalog, setCatalog] = useState<CollectionCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const count = catalog?.count ?? 0;
  const windowed = useCollectionWindow(trackRef, count);
  const pixelated = collectionIsPixelated(id);

  useEffect(() => {
    const opened = openCollection(id);
    let cancel = false;
    let unsubscribe = () => {};
    opened.catalog.then(
      (next) => {
        if (cancel) {
          return;
        }
        setCatalog(next);
        unsubscribe = next.subscribe(() => setRevision((value) => value + 1));
      },
      () => {
        if (!cancel) {
          setFailed(true);
        }
      },
    );
    return () => {
      cancel = true;
      unsubscribe();
      opened.release();
    };
  }, [id]);

  useEffect(() => {
    if (!catalog) {
      return;
    }
    for (let index = windowed.start; index < windowed.end; index += 1) {
      catalog.ensure(index);
    }
  }, [catalog, revision, windowed.end, windowed.start]);

  if (!catalog || count < 1) {
    return (
      <article className="column-sheet-row">
        <div className="column-sheet-frame" style={{ aspectRatio: "1" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" draggable={false} decoding="async" />
        </div>
        <RowCaption label={title} description={failed ? "The collection didn’t load." : title} />
      </article>
    );
  }

  const rows = [];
  for (let index = windowed.start; index < windowed.end; index += 1) {
    const piece = catalog.piece(index);
    rows.push(
      <article
        key={index}
        className="column-sheet-window-row"
        style={{ top: index * windowed.stride, height: windowed.stride }}
      >
        <div className="column-sheet-frame" style={{ aspectRatio: "1" }}>
          {piece ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={piece.src}
              alt=""
              draggable={false}
              decoding="async"
              data-pixelated={pixelated ? "" : undefined}
              sizes="(min-width: 752px) 720px, calc(100vw - 32px)"
            />
          ) : null}
        </div>
        <RowCaption label={piece?.name ?? title} description={title} />
      </article>,
    );
  }

  return (
    <div className="column-sheet-window" style={{ height: count * windowed.stride }}>
      {rows}
    </div>
  );
}

function useCollectionWindow(trackRef: RefObject<HTMLDivElement | null>, count: number) {
  const [windowed, setWindowed] = useState({ start: 0, end: 0, stride: 480 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 1) {
      return;
    }

    const read = () => {
      const width = Math.min(Math.max(track.clientWidth - 32, 160), 720);
      const stride = width + CAPTION_BLOCK;
      const start = Math.max(0, Math.floor(track.scrollTop / stride) - OVERSCAN);
      const end = Math.min(count, Math.ceil((track.scrollTop + track.clientHeight) / stride) + OVERSCAN + 1);
      setWindowed((current) =>
        current.start === start && current.end === end && current.stride === stride
          ? current
          : { start, end, stride },
      );
    };

    read();
    track.addEventListener("scroll", read, { passive: true });
    const observer = new ResizeObserver(read);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", read);
      observer.disconnect();
    };
  }, [count, trackRef]);

  return windowed;
}

function RowCaption({ label, description }: { label: string; description: string }) {
  const same = label.trim() === description.trim();
  if (!label && !description) {
    return null;
  }

  return (
    <div className="column-sheet-caption">
      {label ? <p className="column-sheet-label">{label}</p> : null}
      {!same && description ? <p className="column-sheet-description">{description}</p> : null}
    </div>
  );
}

function frameAspect(tile: PresentationTile): string | undefined {
  if (tile.aspect && tile.aspect > 0) {
    return String(tile.aspect);
  }
  if (tile.width > 0 && tile.height > 0) {
    return `${tile.width} / ${tile.height}`;
  }
  return "1";
}

function restoreFocus(selector: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(selector)?.focus();
  });
}
