"use client";

import {
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { GalleryItem } from "@/lib/gallery";

const ROW_PX = 8;
const GAP_PX = 16;
const IDEAL_CARD_PX = 360;
const MIN_CARD_PX = 280;
const INITIAL_COLUMNS = 2;
const INITIAL_COLUMN_WIDTH_PX = IDEAL_CARD_PX;

const IMAGE_SIZES =
  "(min-width: 1200px) 25vw, (min-width: 800px) 33vw, (min-width: 560px) 50vw, calc(100vw - 48px)";

type MasonryLayout = {
  columns: number;
  columnWidth: number;
};

function columnCount(contentWidth: number): number {
  const span = contentWidth + GAP_PX;
  const ideal = Math.ceil(span / (IDEAL_CARD_PX + GAP_PX));
  const atLeastMin = Math.max(1, Math.floor(span / (MIN_CARD_PX + GAP_PX)));
  return Math.max(1, Math.min(ideal, atLeastMin));
}

function columnWidth(contentWidth: number, columns: number): number {
  return (contentWidth - GAP_PX * (columns - 1)) / columns;
}

function isGalleryMark(tile: GalleryItem): boolean {
  switch (tile.media) {
    case "image":
    case "frame":
      return tile.mark === true;
    case "video":
      return false;
    default: {
      const unknownTile: never = tile;
      return unknownTile;
    }
  }
}

function frameEmbedClass(
  fit: "screen" | "poster" | undefined,
  kind: "masonry" | "lightbox",
) {
  const base = kind === "masonry" ? "work-masonry-embed" : "work-lightbox-embed";
  switch (fit) {
    case "screen":
      return `${base} ${base}-screen`;
    case "poster":
      return `${base} ${base}-poster`;
    case undefined:
      return base;
    default: {
      const unknownFit: never = fit;
      return unknownFit;
    }
  }
}

function TileLabel({ title }: { title: string }) {
  return (
    <>
      <span className="work-masonry-title">{title}</span>
      <HugeiconsIcon
        icon={ArrowExpand01Icon}
        size="1cap"
        strokeWidth={1.5}
        color="currentColor"
        aria-hidden="true"
      />
      <span className="play-a11y">Open larger.</span>
    </>
  );
}

function rowSpan(tile: GalleryItem, width: number): number {
  const imageHeight = width * (tile.height / tile.width);
  return Math.max(1, Math.round((imageHeight + GAP_PX) / (ROW_PX + GAP_PX)));
}

type WorkMasonryProps = {
  tiles: GalleryItem[];
};

function TileVisual({
  tile,
  eager,
  reducedMotion,
}: {
  tile: GalleryItem;
  eager: boolean;
  reducedMotion: boolean;
}) {
  switch (tile.media) {
    case "image":
      return (
        <Image
          src={tile.src}
          alt={tile.alt}
          width={tile.width}
          height={tile.height}
          sizes={IMAGE_SIZES}
          loading={eager ? "eager" : "lazy"}
          className="work-masonry-image"
          style={{
            position: "absolute",
            inset: tile.pad == null ? 0 : `${tile.pad}cqw`,
            width: tile.pad == null ? "100%" : `calc(100% - ${tile.pad * 2}cqw)`,
            height: tile.pad == null ? "100%" : `calc(100% - ${tile.pad * 2}cqw)`,
            maxWidth: tile.pad == null ? undefined : "none",
            objectFit: tile.mark ? "contain" : "cover",
          }}
          draggable={false}
        />
      );
    case "video":
      return (
        <video
          className="work-masonry-video"
          src={tile.src}
          poster={tile.poster}
          muted
          loop
          playsInline
          autoPlay={!reducedMotion}
          preload={reducedMotion ? "none" : "metadata"}
          tabIndex={-1}
          aria-hidden="true"
        />
      );
    case "frame":
      return (
        <iframe
          className={frameEmbedClass(tile.fit, "masonry")}
          src={tile.src}
          title={tile.alt}
          loading={eager ? "eager" : "lazy"}
        />
      );
    default: {
      const unknownTile: never = tile;
      return unknownTile;
    }
  }
}

function LightboxVisual({
  tile,
  reducedMotion,
}: {
  tile: GalleryItem;
  reducedMotion: boolean;
}) {
  switch (tile.media) {
    case "image":
      return (
        <Image
          key={tile.id}
          src={tile.src}
          alt={tile.alt}
          width={tile.width}
          height={tile.height}
          sizes="100vw"
          quality={90}
          className="work-lightbox-image"
          draggable={false}
        />
      );
    case "video":
      return (
        <video
          key={tile.id}
          className="work-lightbox-image"
          src={tile.src}
          poster={tile.poster}
          controls
          autoPlay={!reducedMotion}
          loop
          muted
          playsInline
          preload={reducedMotion ? "none" : "metadata"}
        />
      );
    case "frame":
      return (
        <iframe
          key={tile.id}
          className={frameEmbedClass(tile.fit, "lightbox")}
          src={tile.src}
          title={tile.alt}
        />
      );
    default: {
      const unknownTile: never = tile;
      return unknownTile;
    }
  }
}

export function WorkMasonry({ tiles }: WorkMasonryProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [layout, setLayout] = useState<MasonryLayout>({
    columns: INITIAL_COLUMNS,
    columnWidth: INITIAL_COLUMN_WIDTH_PX,
  });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = gridRef.current;
    if (!node) {
      return;
    }

    const apply = (width: number, force: boolean) => {
      const columns = columnCount(width);
      const nextWidth = columnWidth(width, columns);
      setLayout((current) => {
        if (!force && current.columns === columns) {
          return current;
        }

        if (
          current.columns === columns &&
          Math.abs(current.columnWidth - nextWidth) < 0.5
        ) {
          return current;
        }

        return { columns, columnWidth: nextWidth };
      });
    };

    const read = (force: boolean) => {
      const width = node.clientWidth;
      if (width > 0) {
        apply(width, force);
      }
    };

    read(true);
    const observer = new ResizeObserver(() => {
      read(false);
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) {
      return;
    }

    const videos = root.querySelectorAll("video");
    videos.forEach((video) => {
      if (reducedMotion || openIndex != null) {
        video.pause();
        return;
      }

      void video.play().catch(() => undefined);
    });
  }, [reducedMotion, openIndex, tiles]);

  if (tiles.length === 0) {
    return null;
  }

  const openTile = openIndex == null ? null : tiles[openIndex] ?? null;

  const openAt = (index: number) => {
    setOpenIndex(index);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const step = (delta: number) => {
    setOpenIndex((current) => {
      if (current == null) {
        return current;
      }

      return (current + delta + tiles.length) % tiles.length;
    });
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  const gridStyle = {
    "--work-masonry-cols": layout.columns,
  } as CSSProperties;

  return (
    <section className="work-masonry" aria-label="Gallery">
      <div ref={gridRef} className="work-masonry-grid" style={gridStyle}>
        {tiles.map((tile, index) => {
          const cardStyle = {
            gridRow: `span ${rowSpan(tile, layout.columnWidth)}`,
          };
          const visual = (
            <TileVisual
              tile={tile}
              eager={index < layout.columns}
              reducedMotion={reducedMotion}
            />
          );

          if (tile.media === "frame") {
            return (
              <div key={tile.id} className="work-masonry-card" style={cardStyle}>
                <span
                  className={
                    tile.mark
                      ? "work-masonry-frame work-masonry-mark"
                      : "work-masonry-frame"
                  }
                >
                  {visual}
                  <button
                    type="button"
                    className="work-masonry-verb"
                    aria-haspopup="dialog"
                    aria-expanded={openIndex === index}
                    aria-controls="work-lightbox"
                    onClick={() => openAt(index)}
                  >
                    <TileLabel title={tile.title} />
                  </button>
                </span>
              </div>
            );
          }

          return (
            <button
              key={tile.id}
              type="button"
              className="work-masonry-card"
              style={cardStyle}
              aria-haspopup="dialog"
              aria-expanded={openIndex === index}
              aria-controls="work-lightbox"
              onClick={() => openAt(index)}
            >
              <span
                className={
                  tile.media === "image" && tile.mark
                    ? "work-masonry-frame work-masonry-mark"
                    : "work-masonry-frame"
                }
                style={
                  tile.media === "image" && tile.pad != null
                    ? { containerType: "size" }
                    : undefined
                }
              >
                {visual}
                <span className="work-masonry-verb">
                  <TileLabel title={tile.title} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <dialog
        ref={dialogRef}
        id="work-lightbox"
        className="work-lightbox"
        aria-labelledby="work-lightbox-title"
        onClose={() => setOpenIndex(null)}
        onKeyDown={onDialogKeyDown}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
      >
        {openTile ? (
          <div
            className="work-lightbox-layout"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                dialogRef.current?.close();
              }
            }}
          >
            <button
              type="button"
              className="work-lightbox-close"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={18}
                strokeWidth={1.5}
                color="currentColor"
                aria-hidden="true"
              />
            </button>
            <figure
              className="work-lightbox-figure"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  dialogRef.current?.close();
                }
              }}
            >
              <span
                className={
                  isGalleryMark(openTile)
                    ? "work-lightbox-frame work-lightbox-mark"
                    : "work-lightbox-frame"
                }
                data-media={openTile.media}
                data-fit={
                  openTile.media === "frame" ? openTile.fit : undefined
                }
                style={
                  {
                    "--lightbox-w": openTile.width,
                    "--lightbox-h": openTile.height,
                  } as CSSProperties
                }
              >
                <LightboxVisual tile={openTile} reducedMotion={reducedMotion} />
              </span>
            </figure>
            <div className="work-lightbox-bar">
              {tiles.length > 1 ? (
                <button
                  type="button"
                  className="work-lightbox-step"
                  aria-label="Previous image"
                  onClick={() => step(-1)}
                >
                  <HugeiconsIcon
                    icon={ArrowLeft01Icon}
                    size={18}
                    strokeWidth={1.5}
                    color="currentColor"
                    aria-hidden="true"
                  />
                </button>
              ) : null}
              <p id="work-lightbox-title" className="work-lightbox-title">
                {openTile.title}
              </p>
              {tiles.length > 1 ? (
                <button
                  type="button"
                  className="work-lightbox-step"
                  aria-label="Next image"
                  onClick={() => step(1)}
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={18}
                    strokeWidth={1.5}
                    color="currentColor"
                    aria-hidden="true"
                  />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
