"use client";

import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";

import { BoardFilterBar, useBoardFilter, type BoardFilter } from "@/components/board-filters";
import { ExpandLoop } from "@/components/board/expand-loop";
import { createMasonryFlex } from "@/components/board/masonry-flex";
import { revealOnScroll } from "@/components/board/reveal";
import { PresentationResting } from "@/components/board/presentations/resting";
import { TileChrome } from "@/components/board/tile-chrome";
import { prefetchCollection } from "@/lib/collections";
import type { HomeCard, TileHover } from "@/lib/home";

const WIDE_BOARD = "(min-width: 1100px)";

type OpenCard = {
  card: HomeCard;
  origin: HTMLElement;
};

export function BoardMasonry({ columns }: { columns: HomeCard[][] }) {
  const { filter, revision } = useBoardFilter();
  const [open, setOpen] = useState<OpenCard | null>(null);
  const masonryRef = useRef<HTMLDivElement>(null);
  const [flex] = useState(() =>
    createMasonryFlex({
      tileSelector: ".board-tile",
      columnSelector: ".board-column",
      wideQuery: WIDE_BOARD,
    }),
  );
  const filterKey = `${filter}:${revision}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  if (seenFilter !== filterKey) {
    setSeenFilter(filterKey);
    setOpen(null);
  }
  const visible = columns
    .map((column) => column.filter((tile) => tileVisible(tile, filter)))
    .filter((column) => column.length > 0);

  useEffect(() => {
    return () => flex.dispose();
  }, [flex]);

  useEffect(() => {
    flex.release(masonryRef.current, false);
  }, [filter, revision, flex]);

  useEffect(() => {
    const root = masonryRef.current;
    if (!root) {
      return;
    }
    const tiles = [...root.querySelectorAll<HTMLElement>(".board-tile")];
    return revealOnScroll(tiles, null);
  }, [filter, revision]);

  useEffect(() => {
    const root = masonryRef.current;
    if (!root) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const videos = [...root.querySelectorAll<HTMLVideoElement>("video[data-play='always']")];
    let observer: IntersectionObserver | null = null;

    const pause = (video: HTMLVideoElement) => {
      video.pause();
    };

    const watch = () => {
      observer?.disconnect();
      observer = null;
      if (motion.matches || open) {
        videos.forEach(pause);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const video = entry.target;
            if (!(video instanceof HTMLVideoElement)) {
              continue;
            }
            if (!entry.isIntersecting) {
              pause(video);
              continue;
            }
            const source = video.dataset.src;
            if (source && video.dataset.armed !== "true") {
              video.dataset.armed = "true";
              video.src = source;
            }
            void video.play().catch(() => undefined);
          }
        },
        { rootMargin: "200px 0px", threshold: 0 },
      );
      videos.forEach((video) => observer?.observe(video));
    };

    watch();
    motion.addEventListener("change", watch);
    return () => {
      motion.removeEventListener("change", watch);
      observer?.disconnect();
      videos.forEach(pause);
    };
  }, [filter, open]);

  return (
    <>
      <BoardFilterBar placement="top" />
      <div
        className="board-masonry"
        data-cols={visible.length}
        ref={masonryRef}
        onPointerOver={flex.grow}
        onPointerLeave={() => flex.release(masonryRef.current, true)}
        onFocus={flex.grow}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
          }
          flex.release(masonryRef.current, true);
        }}
      >
        {visible.map((column, index) => (
          <div className="board-column" key={column.map((tile) => tileKey(tile)).join("-") || index}>
            {column.map((tile) => (
              <WorkCard
                key={tile.key}
                card={tile}
                held={open?.card.key === tile.key}
                onOpen={setOpen}
              />
            ))}
          </div>
        ))}
      </div>
      {open ? (
        <ExpandLoop
          spec={open.card.opening.spec}
          origin={boxOf(open.origin)}
          heldSelector={`[data-portfolio-key="${cssEscape(open.card.key)}"]`}
          chromeSelector=".home-board-main .board-filters"
          className="board-presentation-loop"
          onExited={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function boxOf(origin: HTMLElement) {
  const rect = origin.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function cssEscape(value: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

function tileVisible(tile: HomeCard, filter: BoardFilter): boolean {
  return filter === "all" || tile.filter === filter;
}

function tileKey(tile: HomeCard): string {
  return tile.key;
}

function hoverStyle(hover: TileHover): CSSProperties {
  return {
    "--tile-duration": `${hover.duration}ms`,
    "--bg-from-x": `${hover.background.from.x}px`,
    "--bg-from-y": `${hover.background.from.y}px`,
    "--bg-from-scale": hover.background.from.scale,
    "--bg-from-opacity": hover.background.from.opacity,
    "--bg-to-x": `${hover.background.to.x}px`,
    "--bg-to-y": `${hover.background.to.y}px`,
    "--bg-to-scale": hover.background.to.scale,
    "--bg-to-opacity": hover.background.to.opacity,
    "--fg-from-x": `${hover.foreground.from.x}px`,
    "--fg-from-y": `${hover.foreground.from.y}px`,
    "--fg-from-scale": hover.foreground.from.scale,
    "--fg-from-opacity": hover.foreground.from.opacity,
    "--fg-to-x": `${hover.foreground.to.x}px`,
    "--fg-to-y": `${hover.foreground.to.y}px`,
    "--fg-to-scale": hover.foreground.to.scale,
    "--fg-to-opacity": hover.foreground.to.opacity,
  } as CSSProperties;
}

function setHoverMedia(tile: HTMLElement, playing: boolean) {
  for (const node of tile.querySelectorAll("video[data-play='hover']")) {
    if (!(node instanceof HTMLVideoElement)) {
      continue;
    }
    if (playing) {
      void node.play();
      continue;
    }
    node.pause();
    node.currentTime = 0;
  }
}

function playTileMedia(event: SyntheticEvent<HTMLElement>) {
  setHoverMedia(event.currentTarget, true);
}

function pauseTileMedia(event: SyntheticEvent<HTMLElement>) {
  setHoverMedia(event.currentTarget, false);
}

function WorkCard({
  card,
  held,
  onOpen,
}: {
  card: HomeCard;
  held: boolean;
  onOpen: (next: OpenCard) => void;
}) {
  const spec = card.opening.spec;
  const collectionId = spec.collection?.id;

  return (
    <button
      type="button"
      className="board-card board-tile"
      data-frame={card.frame}
      data-presentation={spec.id}
      data-portfolio-key={card.key}
      data-held={held ? "" : undefined}
      aria-haspopup="dialog"
      aria-label={`Open ${card.label}`}
      style={{
        ...hoverStyle(card.hover),
        ...(card.ratio ? { aspectRatio: card.ratio } : {}),
      }}
      onPointerEnter={(event) => {
        playTileMedia(event);
        if (collectionId) {
          prefetchCollection(collectionId);
        }
      }}
      onPointerLeave={pauseTileMedia}
      onFocus={(event) => {
        playTileMedia(event);
        if (collectionId) {
          prefetchCollection(collectionId);
        }
      }}
      onBlur={pauseTileMedia}
      onClick={(event) => {
        if (collectionId) {
          prefetchCollection(collectionId);
        }
        for (const node of event.currentTarget.querySelectorAll("video")) {
          if (node instanceof HTMLVideoElement) {
            node.pause();
          }
        }
        onOpen({ card, origin: event.currentTarget });
      }}
    >
      <PresentationResting spec={spec} />
      <TileChrome
        label={card.label}
        titleClassName="board-tile-title"
        expandClassName="board-tile-expand"
      />
    </button>
  );
}

