"use client";

import { ArrowExpand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";

import { BoardStage } from "@/components/board-stage";
import { prefetchCollection } from "@/lib/collections";
import type { HomeCard, TileBackground, TileForeground, TileHover } from "@/lib/home";

const FILTERS = [
  { id: "product", label: "Product" },
  { id: "brand", label: "Brand" },
  { id: "play", label: "Play" },
  { id: "all", label: "All" },
] as const;

type BoardFilter = (typeof FILTERS)[number]["id"];

const WIDE_BOARD = "(min-width: 1100px)";
const HOVER_GROW = 2.8;
const REST_GROW = 1;
const HOVER_AMOUNT = 0.5;
const FLEX_EASE_MS = 400;
let pendingTile: HTMLElement | null = null;
let flexGeneration = 0;
let releaseTimer = 0;

type OpenCard = {
  card: HomeCard;
  origin: HTMLElement;
};

export function BoardMasonry({ columns }: { columns: HomeCard[][] }) {
  const [filter, setFilter] = useState<BoardFilter>("product");
  const [open, setOpen] = useState<OpenCard | null>(null);
  const [releasing, setReleasing] = useState(false);
  const masonryRef = useRef<HTMLDivElement>(null);
  const visible = columns
    .map((column) => column.filter((tile) => tileVisible(tile, filter)))
    .filter((column) => column.length > 0);

  useEffect(() => {
    releaseBoard(masonryRef.current, false);
  }, [filter]);

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
      <div className="board-filters" role="group" aria-label="Filter work">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="board-filter"
            aria-pressed={filter === item.id}
            onClick={() => {
              setOpen(null);
              setFilter(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="board-masonry"
        data-cols={visible.length}
        data-expanding={
          open?.card.opening.kind === "project" ? (releasing ? "closing" : "") : undefined
        }
        ref={masonryRef}
        onPointerOver={growTile}
        onPointerLeave={() => releaseBoard(masonryRef.current, true)}
        onFocus={growTile}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
          }
          releaseBoard(masonryRef.current, true);
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

function growTile(event: SyntheticEvent<HTMLDivElement>) {
  const masonry = event.currentTarget;
  if (!(event.target instanceof Element)) {
    return;
  }

  const tile = event.target.closest(".board-tile");
  if (!(tile instanceof HTMLElement) || !masonry.contains(tile)) {
    return;
  }

  window.clearTimeout(releaseTimer);

  const column = tile.parentElement;
  if (!(column instanceof HTMLElement)) {
    return;
  }

  if (!window.matchMedia(WIDE_BOARD).matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const columns = [...masonry.querySelectorAll<HTMLElement>(":scope > .board-column")];
  const columnIndex = columns.indexOf(column);
  if (columnIndex < 0) {
    return;
  }

  if (masonry.dataset.flexing !== "live" && masonry.dataset.flexing !== "lock") {
    for (const col of columns) {
      col.style.height = `${col.getBoundingClientRect().height}px`;
      for (const child of col.querySelectorAll<HTMLElement>(":scope > .board-tile")) {
        const weight = String(Math.max(child.getBoundingClientRect().height, 1) / 100);
        child.dataset.restGrow = weight;
        child.style.flexGrow = weight;
      }
    }
    const generation = ++flexGeneration;
    masonry.dataset.flexing = "lock";
    pendingTile = tile;
    requestAnimationFrame(() => {
      if (generation !== flexGeneration || masonry.dataset.flexing !== "lock") {
        return;
      }
      masonry.dataset.flexing = "live";
      requestAnimationFrame(() => {
        if (generation !== flexGeneration || masonry.dataset.flexing !== "live") {
          return;
        }
        const target = pendingTile ?? tile;
        pendingTile = null;
        if (!target.isConnected) {
          return;
        }
        const nextColumn = target.parentElement;
        const nextIndex =
          nextColumn instanceof HTMLElement ? columns.indexOf(nextColumn) : columnIndex;
        applyGrowth(masonry, columns, nextIndex < 0 ? columnIndex : nextIndex, target);
      });
    });
    return;
  }

  if (masonry.dataset.flexing === "lock") {
    pendingTile = tile;
    return;
  }

  applyGrowth(masonry, columns, columnIndex, tile);
}

function applyGrowth(
  masonry: HTMLElement,
  columns: HTMLElement[],
  columnIndex: number,
  tile: HTMLElement,
) {
  masonry.dataset.grow = String(columnIndex);

    columns.forEach((col, index) => {
    for (const child of col.querySelectorAll<HTMLElement>(":scope > .board-tile")) {
      if (index !== columnIndex) {
        child.style.flexGrow = child.dataset.restGrow ?? String(REST_GROW);
        continue;
      }
      const rest = Number(child.dataset.restGrow ?? REST_GROW);
      const target = child === tile ? HOVER_GROW : REST_GROW;
      child.style.flexGrow = String(rest + (target - rest) * HOVER_AMOUNT);
    }
  });
}

function releaseBoard(masonry: HTMLDivElement | null, animate: boolean) {
  window.clearTimeout(releaseTimer);
  if (!masonry) {
    return;
  }

  flexGeneration += 1;
  pendingTile = null;
  delete masonry.dataset.grow;

  const easeBack =
    animate &&
    masonry.dataset.flexing === "live" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!easeBack) {
    clearFlexLock(masonry);
    return;
  }

  for (const tile of masonry.querySelectorAll<HTMLElement>(".board-tile")) {
    tile.style.flexGrow = tile.dataset.restGrow ?? String(REST_GROW);
  }

  const generation = flexGeneration;
  releaseTimer = window.setTimeout(() => {
    if (generation !== flexGeneration) {
      return;
    }
    clearFlexLock(masonry);
  }, FLEX_EASE_MS + 50);
}

function clearFlexLock(masonry: HTMLElement) {
  delete masonry.dataset.flexing;
  delete masonry.dataset.grow;

  for (const col of masonry.querySelectorAll<HTMLElement>(".board-column")) {
    col.style.height = "";
  }

  for (const tile of masonry.querySelectorAll<HTMLElement>(".board-tile")) {
    tile.style.flexGrow = "";
    delete tile.dataset.restGrow;
  }
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

  const media = (
    <>
      <TileBackground background={card.background} decorative={card.foreground !== undefined} />
      {card.foreground ? <TileForeground foreground={card.foreground} /> : null}
    </>
  );
  const tileProps = {
    className: "board-card board-tile",
    "data-frame": card.frame,
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
      <span className="board-tile-title">{card.label}</span>
      <span className="board-tile-expand" aria-hidden="true">
        <HugeiconsIcon
          icon={ArrowExpand01Icon}
          size={16}
          strokeWidth={1.75}
          color="currentColor"
        />
      </span>
    </button>
  );
}

