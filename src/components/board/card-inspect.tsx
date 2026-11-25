"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { imageLayer } from "@/components/board/card-media";
import type { PresentationTile } from "@/components/board/presentations/types";

export type CardInspectSource = {
  kind: "image" | "video";
  src: string;
  poster?: string;
  label: string;
  description: string;
};

export function tileInspectSource(tile: PresentationTile): CardInspectSource | null {
  const video = tile.media?.layers.find((layer) => layer.kind === "video");
  if (video?.kind === "video") {
    return {
      kind: "video",
      src: video.src,
      poster: video.poster,
      label: tile.label,
      description: tile.description,
    };
  }

  const image = tile.image ?? imageLayer(tile.media)?.src;
  if (!image) {
    return null;
  }

  return {
    kind: "image",
    src: image,
    label: tile.label,
    description: tile.description,
  };
}

export function CardInspect({
  source,
  onClose,
}: {
  source: CardInspectSource;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reduced = useReducedMotion() === true;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return createPortal(
    <div
      className="card-inspect"
      role="dialog"
      aria-modal="true"
      aria-label={source.label}
      onClick={onClose}
    >
      <figure
        className="card-inspect-figure"
        onClick={(event) => event.stopPropagation()}
      >
        {source.kind === "video" ? (
          <video
            className="card-inspect-media"
            src={source.src}
            poster={source.poster}
            controls
            autoPlay={!reduced}
            muted
            playsInline
            loop
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-inspect-media" src={source.src} alt="" draggable={false} />
        )}
        <figcaption className="card-inspect-caption">
          <span className="card-inspect-label">{source.label}</span>
          {source.description ? (
            <span className="card-inspect-description">{source.description}</span>
          ) : null}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
