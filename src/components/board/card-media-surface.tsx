"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import { CardShaderFill } from "@/components/board/card-shader-fill";
import { orderedLayers, type CardLayer, type CardMedia, type VideoPlayMode } from "@/components/board/card-media";

const CARD_SELECTOR = ".board-tile, .card-shell, .card-masonry-tile";

export function CardMediaSurface({
  media,
  imagePosition,
  interactive = false,
}: {
  media: CardMedia;
  /** Overrides the image layer's object-position for the open frame. */
  imagePosition?: string;
  /** When true, embed iframes can take focus and pointer input. */
  interactive?: boolean;
}) {
  const layers = orderedLayers(media.layers);
  const reduced = useReducedMotion() === true;
  const exposed =
    interactive &&
    layers.some((layer) => layer.kind === "embed" || (layer.kind === "video" && reduced));

  return (
    <div className="card-media" aria-hidden={exposed ? undefined : true}>
      {layers.map((layer) => (
        <MediaLayer
          key={layer.kind}
          layer={layer}
          imagePosition={imagePosition}
          interactive={interactive}
        />
      ))}
    </div>
  );
}

function MediaLayer({
  layer,
  imagePosition,
  interactive,
}: {
  layer: CardLayer;
  imagePosition?: string;
  interactive: boolean;
}) {
  const style = { opacity: layer.opacity ?? (layer.kind === "noise" ? 0.16 : 1) } as CSSProperties;

  switch (layer.kind) {
    case "image":
      return (
        <span className="card-media-layer" data-kind="image" data-fit={layer.fit} style={style}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={layer.src}
            alt=""
            draggable={false}
            style={{ objectPosition: imagePosition ?? layer.position ?? "center top" }}
          />
        </span>
      );
    case "video":
      return (
        <span className="card-media-layer" data-kind="video" data-fit={layer.fit} style={style}>
          <MediaVideo src={layer.src} poster={layer.poster} playMode={layer.playMode ?? "hover"} />
        </span>
      );
    case "embed":
      return (
        <span className="card-media-layer" data-kind="embed" style={style}>
          <iframe
            src={layer.src}
            title={layer.title}
            tabIndex={interactive ? 0 : -1}
            sandbox="allow-scripts allow-same-origin"
          />
        </span>
      );
    case "texture":
      return (
        <span className="card-media-layer" data-kind="texture" style={{ ...style, background: layer.gradient }} />
      );
    case "shader":
      return <ShaderLayer opacity={layer.opacity} />;
    case "noise":
      return <NoiseLayer style={style} />;
    default: {
      const unreachable: never = layer;
      return unreachable;
    }
  }
}

function ShaderLayer({ opacity }: { opacity?: number }) {
  const reduced = useReducedMotion() === true;
  const [hidden, setHidden] = useState(reduced);

  if (hidden || reduced) {
    return null;
  }

  return (
    <span className="card-media-layer" data-kind="shader" style={{ opacity: opacity ?? 1 }}>
      <CardShaderFill onUnavailable={() => setHidden(true)} />
    </span>
  );
}

function NoiseLayer({ style }: { style: CSSProperties }) {
  const id = useId().replace(/:/g, "");

  return (
    <span className="card-media-layer" data-kind="noise" style={style}>
      <svg className="card-media-noise" aria-hidden="true">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </span>
  );
}

function MediaVideo({
  src,
  poster,
  playMode,
}: {
  src: string;
  poster?: string;
  playMode: VideoPlayMode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion() === true;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const host = video.closest(CARD_SELECTOR);
    let observer: IntersectionObserver | null = null;
    let visible = false;
    let hovering = false;
    let focused = false;

    const pause = () => {
      video.pause();
    };

    const allow = () => {
      if (reduced || document.hidden || !visible) {
        return false;
      }
      if (playMode === "hover") {
        const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        return fine ? hovering || focused : focused;
      }
      return true;
    };

    const sync = () => {
      if (!allow()) {
        pause();
        return;
      }
      if (!video.getAttribute("src")) {
        video.src = src;
      }
      void video.play().catch(() => undefined);
    };

    const onEnter = () => {
      hovering = true;
      sync();
    };
    const onLeave = () => {
      hovering = false;
      sync();
    };
    const onFocus = () => {
      focused = true;
      sync();
    };
    const onBlur = (event: Event) => {
      const next = event instanceof FocusEvent ? event.relatedTarget : null;
      if (host instanceof Node && next instanceof Node && host.contains(next)) {
        return;
      }
      focused = false;
      sync();
    };
    const onHide = () => sync();

    observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible && !video.getAttribute("src") && !reduced) {
          video.src = src;
        }
        sync();
      },
      { rootMargin: "200px 0px", threshold: 0 },
    );
    observer.observe(video);

    host?.addEventListener("pointerenter", onEnter);
    host?.addEventListener("pointerleave", onLeave);
    host?.addEventListener("focusin", onFocus);
    host?.addEventListener("focusout", onBlur);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      observer?.disconnect();
      host?.removeEventListener("pointerenter", onEnter);
      host?.removeEventListener("pointerleave", onLeave);
      host?.removeEventListener("focusin", onFocus);
      host?.removeEventListener("focusout", onBlur);
      document.removeEventListener("visibilitychange", onHide);
      pause();
    };
  }, [playMode, reduced, src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      controls={reduced}
      aria-hidden={reduced ? undefined : true}
    />
  );
}
