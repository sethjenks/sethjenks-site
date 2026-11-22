"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";

import { BoardFilterBar, useBoardFilter, type BoardFilter } from "@/components/board-filters";
import { BoardStage } from "@/components/board-stage";
import { ExpandLoop } from "@/components/board/expand-loop";
import { createMasonryFlex } from "@/components/board/masonry-flex";
import { PresentationResting } from "@/components/board/presentations/resting";
import { TileChrome } from "@/components/board/tile-chrome";
import { prefetchCollection } from "@/lib/collections";
import type { HomeCard, TileBackground, TileForeground, TileHover } from "@/lib/home";

const WIDE_BOARD = "(min-width: 1100px)";

type OpenCard = {
  card: HomeCard;
  origin: HTMLElement;
};

export function BoardMasonry({ columns }: { columns: HomeCard[][] }) {
  const { filter, revision } = useBoardFilter();
  const [open, setOpen] = useState<OpenCard | null>(null);
  const [releasing, setReleasing] = useState(false);
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
        data-expanding={
          open?.card.opening.kind === "project" ? (releasing ? "closing" : "") : undefined
        }
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
      {open?.card.opening.kind === "presentation" ? (
        <ExpandLoop
          spec={open.card.opening.spec}
          origin={boxOf(open.origin)}
          heldSelector={`[data-portfolio-key="${cssEscape(open.card.key)}"]`}
          chromeSelector=".home-board-main .board-filters"
          className="board-presentation-loop"
          onExited={() => setOpen(null)}
        />
      ) : open ? (
        <BoardStage
          card={open.card}
          origin={open.origin}
          onRelease={() => setReleasing(true)}
          onClose={() => {
            setReleasing(false);
            setOpen(null);
          }}
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

const TILE_IMAGE_SIZES = "(max-width: 719px) 100vw, (max-width: 1099px) 50vw, 380px";

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

function TileBackground({ background, decorative }: { background: TileBackground; decorative: boolean }) {
  switch (background.type) {
    case "color":
      return <span className="board-tile-layer board-tile-bg" style={{ background: background.color }} />;
    case "gradient":
      return <span className="board-tile-layer board-tile-bg" style={{ background: background.gradient }} />;
    case "image":
      return (
        <span className="board-tile-layer board-tile-bg" data-fit={background.fit}>
          <Image src={background.src} alt={decorative ? "" : background.alt} fill sizes={TILE_IMAGE_SIZES} />
        </span>
      );
    default: {
      const unreachable: never = background;
      return unreachable;
    }
  }
}

function TileForeground({ foreground }: { foreground: TileForeground }) {
  switch (foreground.type) {
    case "image":
      return (
        <span className="board-tile-layer board-tile-fg" data-fit={foreground.fit}>
          <Image src={foreground.src} alt={foreground.alt} fill sizes={TILE_IMAGE_SIZES} />
        </span>
      );
    case "vector":
      return (
        <span className="board-tile-layer board-tile-fg" data-fit={foreground.fit}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foreground.src} alt={foreground.alt} />
        </span>
      );
    case "video":
      return (
        <span className="board-tile-layer board-tile-fg" data-fit={foreground.fit}>
          <video
            poster={foreground.poster}
            muted
            loop
            playsInline
            preload="none"
            data-play={foreground.play}
            data-src={foreground.play === "always" ? foreground.src : undefined}
            src={foreground.play === "hover" ? foreground.src : undefined}
            aria-label={foreground.alt}
          />
        </span>
      );
    case "html":
      return (
        <span className="board-tile-layer board-tile-fg">
          <iframe src={foreground.src} title={foreground.title} tabIndex={-1} sandbox="allow-scripts allow-same-origin" />
        </span>
      );
    default: {
      const unreachable: never = foreground;
      return unreachable;
    }
  }
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
  if (card.opening.kind === "slot") {
    return (
      <article className="board-card board-tile board-slot" data-frame={card.frame} aria-hidden="true" />
    );
  }

  const presentation = card.opening.kind === "presentation" ? card.opening.spec : null;
  const media = presentation ? (
    <PresentationResting spec={presentation} />
  ) : (
    <>
      <TileBackground background={card.background} decorative={card.foreground !== undefined} />
      {card.foreground ? <TileForeground foreground={card.foreground} /> : null}
    </>
  );
  const tileProps = {
    className: "board-card board-tile",
    "data-frame": card.frame,
    "data-presentation": presentation ? presentation.id : undefined,
    style: {
      ...hoverStyle(card.hover),
      ...(card.ratio ? { aspectRatio: card.ratio } : {}),
    },
    onPointerEnter: (event: SyntheticEvent<HTMLElement>) => {
      playTileMedia(event);
      if (card.opening.kind === "collection") {
        prefetchCollection(card.opening.id);
      }
    },
    onPointerLeave: pauseTileMedia,
    onFocus: playTileMedia,
    onBlur: pauseTileMedia,
  };

  const openCard = (event: SyntheticEvent<HTMLButtonElement>) => {
    if (card.opening.kind === "collection") {
      prefetchCollection(card.opening.id);
    }
    for (const node of event.currentTarget.querySelectorAll("video")) {
      if (node instanceof HTMLVideoElement) {
        node.pause();
      }
    }
    onOpen({ card, origin: event.currentTarget });
  };

  return (
    <button
      {...tileProps}
      type="button"
      aria-haspopup="dialog"
      aria-label={`Open ${card.label}`}
      data-portfolio-key={card.key}
      data-held={held ? "" : undefined}
      onClick={openCard}
    >
      {media}
      <TileChrome
        label={presentation ? (presentation.tiles.find((tile) => tile.resting)?.label ?? card.label) : card.label}
        titleClassName="board-tile-title"
        expandClassName="board-tile-expand"
      />
    </button>
  );
}

