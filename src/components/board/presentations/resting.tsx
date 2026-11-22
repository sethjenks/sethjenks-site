"use client";

import { TileFace, tileHasImage } from "@/components/board/presentations/tile-face";
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

  const hasFace = tileHasImage(tile) || Boolean(tile.icon);
  const masked = tune.masked;
  const radius = tunedContentRadius(tile.radius, tune);

  return (
    <span
      className="card-tile"
      data-image={tileHasImage(tile) ? "" : undefined}
      data-icon={tile.icon ? "" : undefined}
      style={{
        left: `${((tile.x + tile.shiftX) / shell.width) * 100}%`,
        top: `${((tile.y + tile.shiftY) / shell.height) * 100}%`,
        width: `${(tile.width / shell.width) * 100}%`,
        height: `${(tile.height / shell.height) * 100}%`,
        borderRadius:
          (tileHasImage(tile) || tile.icon) && !masked ? 0 : `calc(${radius} / ${shell.width} * 100cqw)`,
      }}
    >
      {hasFace ? <TileFace tile={tile} masked={masked} appearOpen={false} scrollable={false} /> : null}
    </span>
  );
}
