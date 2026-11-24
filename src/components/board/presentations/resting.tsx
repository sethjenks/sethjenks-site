"use client";

import { TileFace, tileHasEmbed, tileHasFace, tileHasImage } from "@/components/board/presentations/tile-face";
import type { PresentationSpec } from "@/components/board/presentations/types";
import { DEFAULT_CARD_TUNE, tunedContentRadius, type CardTune } from "@/components/card-tune-panel";

export function PresentationResting({
  spec,
  tune = DEFAULT_CARD_TUNE,
}: {
  spec: PresentationSpec;
  tune?: CardTune;
}) {
  const tile = spec.tiles.find((item) => item.resting);
  const shell = spec.closed;
  if (!tile) {
    return null;
  }

  const hasFace = tileHasFace(tile);
  const masked = tune.masked;
  const radius = tunedContentRadius(tile.radius, tune);
  // Size from shell width only so masonry/hover grow can't squash the asset.
  const placedX = tile.closedX ?? tile.x + tile.shiftX;
  const placedY = tile.closedY ?? tile.y + tile.shiftY;
  const placedWidth = tile.closedWidth ?? tile.width;
  const placedHeight = tile.closedHeight ?? tile.height;
  const left = (placedX / shell.width) * 100;
  const top = (placedY / shell.width) * 100;
  const width = (placedWidth / shell.width) * 100;

  return (
    <span
      className="card-tile"
      data-image={tileHasImage(tile) ? "" : undefined}
      data-icon={tile.icon ? "" : undefined}
      data-embed={tileHasEmbed(tile) ? "" : undefined}
      data-resting=""
      style={{
        left: `${left}%`,
        top: `${top}cqw`,
        width: `${width}%`,
        height: "auto",
        aspectRatio: `${placedWidth} / ${placedHeight}`,
        borderRadius:
          (tileHasImage(tile) || tileHasEmbed(tile) || tile.icon) && !masked
            ? 0
            : `calc(${radius} / ${shell.width} * 100cqw)`,
      }}
    >
      {hasFace ? <TileFace tile={tile} masked={masked} appearOpen={false} scrollable={false} /> : null}
    </span>
  );
}
