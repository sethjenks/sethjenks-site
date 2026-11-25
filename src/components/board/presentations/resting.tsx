"use client";

import {
  TileFace,
  tileContentRadius,
  tileHasEmbed,
  tileHasFace,
  tileHasImage,
} from "@/components/board/presentations/tile-face";
import type { PresentationSpec } from "@/components/board/presentations/types";
import { DEFAULT_CARD_TUNE, tunedContentRadius, type CardTune } from "@/components/card-tune-panel";
import { IconDock } from "@/components/icon-dock";

export function PresentationResting({
  spec,
  tune = DEFAULT_CARD_TUNE,
}: {
  spec: PresentationSpec;
  tune?: CardTune;
}) {
  if (spec.dock) {
    const marks = [
      ...new Set(spec.tiles.flatMap((tile) => (tile.icon ? [tile.icon.mark] : []))),
    ];
    return (
      <IconDock expanded={false} reduced blank={tune.masked} marks={marks} fitToContainer />
    );
  }

  const tile = spec.tiles.find((item) => item.resting);
  const shell = spec.closed;
  if (!tile) {
    return null;
  }

  const hasFace = tileHasFace(tile);
  const masked = tune.masked;
  const radius = tileContentRadius(tile, tunedContentRadius(tile.radius, tune), masked);
  // Size from shell width only so masonry/hover grow can't squash the asset.
  const placedX = tile.closedX ?? tile.x + tile.shiftX;
  const placedY = tile.closedY ?? tile.y + tile.shiftY;
  const placedWidth = tile.closedWidth ?? tile.width;
  const placedHeight = tile.closedHeight ?? tile.height;
  const left = (placedX / shell.width) * 100;
  const top = (placedY / shell.width) * 100;
  const width = (placedWidth / shell.width) * 100;

  const fill = spec.fill === true;

  return (
    <span
      className="card-tile"
      data-image={tileHasImage(tile) ? "" : undefined}
      data-icon={tile.icon ? "" : undefined}
      data-embed={tileHasEmbed(tile) ? "" : undefined}
      data-resting=""
      data-fill={fill ? "" : undefined}
      style={{
        left: fill ? 0 : `${left}%`,
        top: fill ? 0 : `${top}cqw`,
        width: fill ? "100%" : `${width}%`,
        height: fill ? "100%" : "auto",
        aspectRatio: fill ? undefined : `${placedWidth} / ${placedHeight}`,
        // Equal-axis cqw (not %) so tall phone tiles keep circular corners.
        // Fill cards leave radius to the shell clip.
        borderRadius: fill || radius <= 0 ? 0 : `calc(${radius} / ${shell.width} * 100cqw)`,
      }}
    >
      {hasFace ? <TileFace tile={tile} masked={masked} appearOpen={false} scrollable={false} /> : null}
    </span>
  );
}
