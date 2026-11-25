"use client";

import { useEffect, useRef, useState } from "react";
import { TextMorph } from "torph/react";

import { AppIcon } from "@/components/app-icon";
import { CommandKey } from "@/components/board/command-key";
import { embedLayer, imageLayer } from "@/components/board/card-media";
import { CardMediaSurface } from "@/components/board/card-media-surface";
import { COMMAND_KEY_SRC } from "@/components/board/presentations/key-object";
import type { PresentationTile } from "@/components/board/presentations/types";

export function tileHasImage(tile: PresentationTile): boolean {
  return Boolean(tile.image || imageLayer(tile.media));
}

export function tileHasEmbed(tile: PresentationTile): boolean {
  return Boolean(embedLayer(tile.media));
}

export function tileHasCopy(tile: PresentationTile): boolean {
  return Boolean(tile.copy);
}

export function tileHasFace(tile: PresentationTile): boolean {
  return tileHasImage(tile) || tileHasEmbed(tile) || tileHasCopy(tile) || Boolean(tile.icon) || Boolean(tile.media);
}

/**
 * Corner radius in layout units at the resting (closed) size.
 * Use equal-axis pixels — a CSS percentage would oval on tall phone tiles.
 */
export function tileContentRadius(tile: PresentationTile, radius: number, _masked: boolean): number {
  if (tile.icon || radius <= 0) {
    return 0;
  }
  return radius;
}

/** Same relative roundness when a resting tile resizes to its open frame. */
export function tileOpenRadius(tile: PresentationTile, radius: number, masked: boolean): number {
  const closed = tileContentRadius(tile, radius, masked);
  if (closed <= 0) {
    return 0;
  }
  const closedWidth = tile.closedWidth ?? tile.width;
  if (closedWidth <= 0 || tile.width === closedWidth) {
    return closed;
  }
  return closed * (tile.width / closedWidth);
}

export function imageBox(width: number, height: number, aspect: number) {
  if (width / height > aspect) {
    const fitted = height * aspect;
    return { x: (width - fitted) / 2, y: 0, width: fitted, height };
  }

  const fitted = width / aspect;
  return { x: 0, y: (height - fitted) / 2, width, height: fitted };
}

export function TileFace({
  tile,
  masked,
  appearOpen,
  scrollable,
}: {
  tile: PresentationTile;
  masked: boolean;
  appearOpen: boolean;
  scrollable: boolean;
}) {
  if (tile.copy) {
    return <CardCopyFace copy={tile.copy} />;
  }

  const openImage = appearOpen && tileHasImage(tile) && !tileHasEmbed(tile);
  const box = openImage && tile.aspect ? imageBox(tile.width, tile.height, tile.aspect) : null;
  const embed = embedLayer(tile.media);

  if (embed?.src === COMMAND_KEY_SRC) {
    return <CommandKey interactive={appearOpen} />;
  }

  // Poster + icon: closed shows the poster, open switches to the App Icon.
  const showIcon = Boolean(tile.icon) && (appearOpen || !tile.media);
  const showMedia = Boolean(tile.media) && !showIcon;

  return (
    <>
      {showIcon && tile.icon ? (
        <AppIcon mark={tile.icon.mark} rounded={tile.icon.rounded} blank={masked && !appearOpen} />
      ) : showMedia && tile.media ? (
        <CardMediaSurface
          media={tile.media}
          imagePosition={openImage ? "center" : undefined}
          interactive={appearOpen && tileHasEmbed(tile)}
        />
      ) : tile.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tile.image}
          alt=""
          draggable={false}
          style={{ objectPosition: openImage ? "center" : (tile.imagePosition ?? "center top") }}
        />
      ) : null}
      {scrollable && tileHasImage(tile) && !embed ? (
        <span
          className="card-image-label"
          style={
            box
              ? {
                  left: box.x + 10,
                  bottom: tile.height - (box.y + box.height) + 10,
                  maxWidth: box.width - 20,
                }
              : { left: 10, bottom: 10 }
          }
        >
          {tile.description}
        </span>
      ) : null}
    </>
  );
}

function CardCopyFace({ copy }: { copy: NonNullable<PresentationTile["copy"]> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const root = node.closest(".card-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { root: root instanceof Element ? root : null, threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="card-copy">
      <p className="card-copy-sr">{copy.title ? `${copy.title}. ${copy.body}` : copy.body}</p>
      <div className="card-copy-block" aria-hidden="true">
        <div className="card-copy-sizer">
          {copy.title ? <h3 className="card-copy-title">{copy.title}</h3> : null}
          <p className="card-copy-body">{copy.body}</p>
        </div>
        <div className="card-copy-live">
          {copy.title ? (
            <TextMorph
              as="h3"
              className="card-copy-title"
              duration={700}
              respectReducedMotion
            >
              {shown ? copy.title : ""}
            </TextMorph>
          ) : null}
          <TextMorph as="p" className="card-copy-body" duration={700} respectReducedMotion>
            {shown ? copy.body : ""}
          </TextMorph>
        </div>
      </div>
    </div>
  );
}
