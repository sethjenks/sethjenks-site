"use client";

import { AppIcon } from "@/components/app-icon";
import { imageLayer } from "@/components/board/card-media";
import { CardMediaSurface } from "@/components/board/card-media-surface";
import type { PresentationTile } from "@/components/board/presentations/types";

export function tileHasImage(tile: PresentationTile): boolean {
  return Boolean(tile.image || imageLayer(tile.media));
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
  const openImage = appearOpen && tileHasImage(tile);
  const box = openImage && tile.aspect ? imageBox(tile.width, tile.height, tile.aspect) : null;

  return (
    <>
      {tile.icon ? (
        <AppIcon mark={tile.icon.mark} rounded={tile.icon.rounded} blank={masked && !appearOpen} />
      ) : tile.media ? (
        <CardMediaSurface media={tile.media} imagePosition={openImage ? "center" : undefined} />
      ) : tile.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tile.image}
          alt=""
          draggable={false}
          style={{ objectPosition: openImage ? "center" : (tile.imagePosition ?? "center top") }}
        />
      ) : null}
      {scrollable && tileHasImage(tile) ? (
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
