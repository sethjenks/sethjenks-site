"use client";

import {
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  FullScreenIcon,
  MinimizeScreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import {
  collectionForGallery,
  type CollectionId,
} from "@/lib/collection-ids";
import { prefetchCollection } from "@/lib/collections";
import type {
  GalleryFrame,
  GalleryImage,
  GalleryItem,
  GalleryVideo,
} from "@/lib/gallery";

type CollectionMove = (columnDelta: number, rowDelta: number) => void;
type CollectionEscape = () => boolean;

function loadCollectionLens() {
  return import("@/components/collection-lens");
}

const CollectionLens = dynamic(
  () => loadCollectionLens().then((mod) => mod.CollectionLens),
  { ssr: false, loading: () => null },
);

const SHARED_EASE = [0.23, 1, 0.32, 1] as const;
const FLIP_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const FLIP_MS = 300;

type Box = { x: number; y: number; width: number; height: number };

function toBox(rect: DOMRect): Box {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

function flipTransform(from: Box, laidOut: Box) {
  const sx = laidOut.width === 0 ? 1 : from.width / laidOut.width;
  const sy = laidOut.height === 0 ? 1 : from.height / laidOut.height;
  return `translate(${from.x - laidOut.x}px, ${from.y - laidOut.y}px) scale(${sx}, ${sy})`;
}

function measureLaidOut(element: HTMLElement): Box {
  const previous = element.style.transform;
  element.style.transform = "none";
  const box = toBox(element.getBoundingClientRect());
  element.style.transform = previous;
  return box;
}

function clearFlip(element: HTMLElement) {
  element.style.transform = "";
  element.style.transformOrigin = "";
}

function playSharedFlip(
  element: HTMLElement,
  from: Box,
  to: Box,
  release: boolean,
  onFinish: () => void,
) {
  const laidOut = measureLaidOut(element);
  if (laidOut.width === 0 || laidOut.height === 0) {
    clearFlip(element);
    onFinish();
    return null;
  }

  const start = flipTransform(from, laidOut);
  const end = flipTransform(to, laidOut);
  element.style.transformOrigin = "top left";
  element.style.transform = start;
  const animation = element.animate(
    [{ transform: start }, { transform: end }],
    { duration: FLIP_MS, easing: FLIP_EASE, fill: "forwards" },
  );
  animation.onfinish = () => {
    if (release) {
      clearFlip(element);
    }
    onFinish();
  };
  return animation;
}

const ROW_PX = 8;
const GAP_PX = 16;
const IDEAL_CARD_PX = 360;
const MIN_CARD_PX = 280;
const INITIAL_COLUMNS = 2;
const INITIAL_COLUMN_WIDTH_PX = IDEAL_CARD_PX;

const IMAGE_SIZES =
  "(min-width: 1200px) 25vw, (min-width: 800px) 33vw, (min-width: 560px) 50vw, calc(100vw - 48px)";
const VIDEO_ROOT_MARGIN = "240px 0px";
const ENTER_LIMIT = 6;
const CONTROLS_HIDE_MS = 2500;

type WebkitFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function asWebkitVideo(video: HTMLVideoElement): WebkitFullscreenVideo {
  return video;
}

function stageIsFullscreen(stage: HTMLElement | null) {
  return stage != null && document.fullscreenElement === stage;
}

function leaveLightboxFullscreen(dialog: HTMLElement | null) {
  const video = dialog?.querySelector(".work-lightbox-stage video");
  if (video instanceof HTMLVideoElement) {
    const webkit = asWebkitVideo(video);
    if (webkit.webkitDisplayingFullscreen) {
      webkit.webkitExitFullscreen?.();
    }
  }

  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  }
}

type StillPhase = "enter" | "in" | "out";

type StillLayer = {
  id: string;
  tile: GalleryImage;
  phase: StillPhase;
};

function revealAfterPaint(mark: () => void) {
  window.setTimeout(mark, 0);
}

function isOnScreen(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewWidth = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < viewHeight &&
    rect.left < viewWidth
  );
}

function pushStill(
  current: StillLayer[],
  tile: GalleryImage,
  reducedMotion: boolean,
): StillLayer[] {
  if (reducedMotion) {
    return [{ id: tile.id, tile, phase: "in" }];
  }

  const existing = current.find((layer) => layer.id === tile.id);
  const outgoing = current
    .filter((layer) => layer.id !== tile.id)
    .map((layer) => ({ ...layer, phase: "out" as const }));

  if (existing) {
    return [...outgoing, { ...existing, tile, phase: "in" }];
  }

  return [...outgoing, { id: tile.id, tile, phase: "enter" }];
}

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

function MasonryImage({
  tile,
  eager,
}: {
  tile: GalleryImage;
  eager: boolean;
}) {
  const [ready, setReady] = useState(false);

  return (
    <Image
      src={tile.src}
      alt={tile.alt}
      width={tile.width}
      height={tile.height}
      sizes={IMAGE_SIZES}
      loading={eager ? "eager" : "lazy"}
      className="work-masonry-image"
      data-ready={ready ? "" : undefined}
      style={{
        position: "absolute",
        inset: tile.pad == null ? 0 : `${tile.pad}cqw`,
        width: tile.pad == null ? "100%" : `calc(100% - ${tile.pad * 2}cqw)`,
        height: tile.pad == null ? "100%" : `calc(100% - ${tile.pad * 2}cqw)`,
        maxWidth: tile.pad == null ? undefined : "none",
        objectFit: tile.mark ? "contain" : "cover",
      }}
      draggable={false}
      onLoad={() => revealAfterPaint(() => setReady(true))}
      onError={() => revealAfterPaint(() => setReady(true))}
    />
  );
}

function MasonryVideo({
  tile,
  eager,
}: {
  tile: GalleryVideo;
  eager: boolean;
}) {
  const [ready, setReady] = useState(false);

  return (
    <>
      <Image
        src={tile.poster}
        alt=""
        width={tile.width}
        height={tile.height}
        sizes={IMAGE_SIZES}
        loading={eager ? "eager" : "lazy"}
        className="work-masonry-image"
        data-ready={ready ? "" : undefined}
        draggable={false}
        onLoad={() => revealAfterPaint(() => setReady(true))}
        onError={() => revealAfterPaint(() => setReady(true))}
      />
      <video
        className="work-masonry-video"
        data-src={tile.src}
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        aria-hidden="true"
        onPlaying={(event) => {
          event.currentTarget.setAttribute("data-playing", "");
        }}
        onPause={(event) => {
          event.currentTarget.removeAttribute("data-playing");
        }}
      />
    </>
  );
}

function MasonryEmbed({
  tile,
  eager,
}: {
  tile: Extract<GalleryItem, { media: "frame" }>;
  eager: boolean;
}) {
  const [ready, setReady] = useState(false);

  return (
    <iframe
      className={frameEmbedClass(tile.fit, "masonry")}
      src={tile.src}
      title={tile.alt}
      loading={eager ? "eager" : "lazy"}
      data-ready={ready ? "" : undefined}
      onLoad={() => revealAfterPaint(() => setReady(true))}
    />
  );
}

function TileVisual({
  tile,
  eager,
}: {
  tile: GalleryItem;
  eager: boolean;
}) {
  switch (tile.media) {
    case "image":
      return <MasonryImage tile={tile} eager={eager} />;
    case "video":
      return <MasonryVideo tile={tile} eager={eager} />;
    case "frame":
      return <MasonryEmbed tile={tile} eager={eager} />;
    default: {
      const unknownTile: never = tile;
      return unknownTile;
    }
  }
}

function clockLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

function isFinePointer(event: PointerEvent<HTMLElement>) {
  return event.pointerType === "mouse" || event.pointerType === "pen";
}

function LightboxPlayer({
  tile,
  reducedMotion,
}: {
  tile: GalleryVideo;
  reducedMotion: boolean;
}) {
  const stageRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);
  const playingRef = useRef(false);
  const engagedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const hoveringControlsRef = useRef(false);
  const openAtPointerDown = useRef(false);
  const revealGesture = useRef(false);
  const hoverReveal = useRef(0);
  const pendingSeek = useRef<number | null>(null);
  const pendingAt = useRef(0);
  const hideTimer = useRef(0);
  const fullscreenRef = useRef(false);
  const clockKey = useRef({ current: -1, duration: -1 });
  const paintFrameRef = useRef<(time: number, length: number) => void>(() => {});
  const [controls, setControls] = useState<"closed" | "open">("closed");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState({ current: 0, duration: 0 });

  const clearHide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = 0;
  };

  const hide = () => {
    clearHide();
    if (!openRef.current) {
      return;
    }
    openRef.current = false;
    setControls("closed");
  };

  const scheduleHide = () => {
    clearHide();
    if (
      !openRef.current ||
      !playingRef.current ||
      engagedRef.current ||
      scrubbingRef.current ||
      hoveringControlsRef.current
    ) {
      return;
    }

    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = 0;
      if (
        !playingRef.current ||
        engagedRef.current ||
        scrubbingRef.current ||
        hoveringControlsRef.current
      ) {
        return;
      }
      hide();
    }, CONTROLS_HIDE_MS);
  };

  const reveal = () => {
    if (!openRef.current) {
      openRef.current = true;
      setControls("open");
    }
    scheduleHide();
  };

  const revealFromHover = (event: PointerEvent<HTMLElement>) => {
    if (!isFinePointer(event)) {
      return;
    }

    if (openRef.current) {
      scheduleHide();
      return;
    }

    if (hoverReveal.current) {
      return;
    }

    hoverReveal.current = window.requestAnimationFrame(() => {
      hoverReveal.current = 0;
      reveal();
    });
  };

  const cancelHoverReveal = () => {
    if (!hoverReveal.current) {
      return;
    }
    window.cancelAnimationFrame(hoverReveal.current);
    hoverReveal.current = 0;
  };

  useEffect(() => {
    const paint = (time: number, length: number) => {
      const safeLength = Number.isFinite(length) && length > 0 ? length : 0;
      const safeTime = Number.isFinite(time) && time > 0 ? time : 0;
      const ratio = safeLength > 0 ? Math.min(1, safeTime / safeLength) : 0;
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${ratio})`;
      }

      const nextCurrent = Math.floor(safeTime);
      const nextDuration = Math.floor(safeLength);
      if (
        clockKey.current.current === nextCurrent &&
        clockKey.current.duration === nextDuration
      ) {
        return;
      }

      clockKey.current = { current: nextCurrent, duration: nextDuration };
      setClock({ current: nextCurrent, duration: safeLength });
    };
    paintFrameRef.current = paint;

    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      const seek = seekRef.current;
      if (video && !scrubbingRef.current) {
        const length = Number.isFinite(video.duration) ? video.duration : 0;
        let time = video.currentTime;
        const pending = pendingSeek.current;
        if (pending != null) {
          if (performance.now() - pendingAt.current > 500) {
            pendingSeek.current = null;
          } else {
            time = pending;
          }
        }
        paint(time, length);
        if (seek) {
          seek.value = String(time);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(hoverReveal.current);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    const sync = () => {
      const webkit = video ? asWebkitVideo(video) : null;
      const active =
        stageIsFullscreen(stage) || Boolean(webkit?.webkitDisplayingFullscreen);
      const entered = active && !fullscreenRef.current;
      fullscreenRef.current = active;
      setFullscreen(active);
      if (entered) {
        openRef.current = true;
        setControls("open");
      }
    };

    document.addEventListener("fullscreenchange", sync);
    video?.addEventListener("webkitbeginfullscreen", sync);
    video?.addEventListener("webkitendfullscreen", sync);
    return () => {
      window.clearTimeout(hideTimer.current);
      document.removeEventListener("fullscreenchange", sync);
      video?.removeEventListener("webkitbeginfullscreen", sync);
      video?.removeEventListener("webkitendfullscreen", sync);
      if (stage && document.fullscreenElement === stage) {
        void document.exitFullscreen().catch(() => undefined);
      }
      const webkit = video ? asWebkitVideo(video) : null;
      if (webkit?.webkitDisplayingFullscreen) {
        webkit.webkitExitFullscreen?.();
      }
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().catch(() => {
        playingRef.current = false;
        setPlaying(false);
      });
      return;
    }

    video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) {
      return;
    }

    const webkit = asWebkitVideo(video);
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

    if (webkit.webkitDisplayingFullscreen) {
      webkit.webkitExitFullscreen?.();
      return;
    }

    if (!document.fullscreenEnabled || !stage.requestFullscreen) {
      webkit.webkitEnterFullscreen?.();
      return;
    }

    void stage.requestFullscreen().catch(() => {
      webkit.webkitEnterFullscreen?.();
    });
  };

  const onSeekInput = (event: FormEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const length = Number.isFinite(video.duration) ? video.duration : 0;
    if (length <= 0) {
      return;
    }

    const next = Math.min(Math.max(Number(event.currentTarget.value), 0), length);
    pendingSeek.current = next;
    pendingAt.current = performance.now();
    video.currentTime = next;
    paintFrameRef.current(next, length);
  };

  const beginScrub = (event: PointerEvent<HTMLInputElement>) => {
    scrubbingRef.current = true;
    clearHide();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const endScrub = (event: PointerEvent<HTMLInputElement>) => {
    scrubbingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scheduleHide();
  };

  const onVideoKeyDown = (event: KeyboardEvent<HTMLVideoElement>) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (!openRef.current) {
      reveal();
      return;
    }

    togglePlay();
  };

  const onStageFocus = (event: FocusEvent<HTMLSpanElement>) => {
    const transport = event.currentTarget.querySelector(".work-lightbox-transport");
    const target = event.target;
    const inTransport = target instanceof Node && Boolean(transport?.contains(target));
    const keyboard = target instanceof Element && target.matches(":focus-visible");
    engagedRef.current = inTransport || keyboard;
    if (inTransport || keyboard) {
      reveal();
      return;
    }
    scheduleHide();
  };

  const onStageBlur = (event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && stageRef.current?.contains(next)) {
      return;
    }

    engagedRef.current = false;
    scheduleHide();
  };

  const elapsed = clockLabel(clock.current);
  const total = clockLabel(clock.duration);
  const seekable = clock.duration > 0;

  return (
    <span
      ref={stageRef}
      className="work-lightbox-stage"
      data-controls={controls}
      onPointerMove={revealFromHover}
      onPointerLeave={cancelHoverReveal}
      onFocus={onStageFocus}
      onBlur={onStageBlur}
      onPointerUp={() => {
        window.setTimeout(() => {
          revealGesture.current = false;
        }, 0);
      }}
    >
      <video
        ref={videoRef}
        className="work-lightbox-image"
        src={tile.src}
        poster={tile.poster}
        aria-label={tile.alt}
        tabIndex={0}
        autoPlay={!reducedMotion}
        loop
        muted
        playsInline
        preload={reducedMotion ? "none" : "metadata"}
        onPlay={() => {
          playingRef.current = true;
          setPlaying(true);
          scheduleHide();
        }}
        onPause={() => {
          playingRef.current = false;
          setPlaying(false);
          clearHide();
        }}
        onLoadedMetadata={(event) => {
          const next = event.currentTarget.duration;
          paintFrameRef.current(
            event.currentTarget.currentTime,
            Number.isFinite(next) ? next : 0,
          );
        }}
        onDurationChange={(event) => {
          const next = event.currentTarget.duration;
          paintFrameRef.current(
            event.currentTarget.currentTime,
            Number.isFinite(next) ? next : 0,
          );
        }}
        onSeeked={(event) => {
          const pending = pendingSeek.current;
          if (pending == null) {
            return;
          }
          if (Math.abs(event.currentTarget.currentTime - pending) < 0.35) {
            pendingSeek.current = null;
          }
        }}
        onVolumeChange={(event) => {
          setMuted(event.currentTarget.muted);
        }}
        onPointerDown={() => {
          cancelHoverReveal();
          openAtPointerDown.current = openRef.current;
          revealGesture.current = !openRef.current;
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (!openAtPointerDown.current) {
            reveal();
            return;
          }
          togglePlay();
        }}
        onKeyDown={onVideoKeyDown}
      />
      <span
        className="work-lightbox-transport"
        role="group"
        aria-label="Playback"
        onClickCapture={(event) => {
          if (!revealGesture.current) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          revealGesture.current = false;
        }}
        onPointerEnter={(event) => {
          if (!isFinePointer(event)) {
            return;
          }
          hoveringControlsRef.current = true;
          clearHide();
        }}
        onPointerLeave={(event) => {
          if (!isFinePointer(event)) {
            return;
          }
          hoveringControlsRef.current = false;
          scheduleHide();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.stopPropagation();
          }
        }}
      >
        <button
          type="button"
          className="work-lightbox-step"
          aria-label={playing ? "Pause" : "Play"}
          onClick={togglePlay}
        >
          <HugeiconsIcon
            icon={playing ? PauseIcon : PlayIcon}
            size={18}
            strokeWidth={1.5}
            color="currentColor"
            aria-hidden="true"
          />
        </button>
        <span className="work-lightbox-seek-track">
          <span className="work-lightbox-seek-line" />
          <span ref={fillRef} className="work-lightbox-seek-fill" />
          <input
            ref={seekRef}
            className="work-lightbox-seek"
            type="range"
            min={0}
            max={seekable ? clock.duration : 0}
            step={0.01}
            defaultValue={0}
            disabled={!seekable}
            aria-label="Seek"
            aria-valuetext={`${elapsed} of ${total}`}
            onInput={onSeekInput}
            onPointerDown={beginScrub}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onLostPointerCapture={() => {
              scrubbingRef.current = false;
              scheduleHide();
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
              }
              event.stopPropagation();
              scrubbingRef.current = true;
              clearHide();
            }}
            onKeyUp={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
              }
              scrubbingRef.current = false;
              scheduleHide();
            }}
          />
        </span>
        <span className="work-lightbox-time">
          <span className="play-a11y">Elapsed</span>
          {elapsed}
          <span className="work-lightbox-duration">
            <span aria-hidden="true"> / </span>
            <span className="play-a11y">Duration</span>
            {total}
          </span>
        </span>
        <button
          type="button"
          className="work-lightbox-step"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
        >
          <HugeiconsIcon
            icon={muted ? VolumeOffIcon : VolumeHighIcon}
            size={18}
            strokeWidth={1.5}
            color="currentColor"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className="work-lightbox-step"
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={toggleFullscreen}
        >
          <HugeiconsIcon
            icon={fullscreen ? MinimizeScreenIcon : FullScreenIcon}
            size={18}
            strokeWidth={1.5}
            color="currentColor"
            aria-hidden="true"
          />
        </button>
      </span>
    </span>
  );
}

function LightboxEmbed({ tile }: { tile: GalleryFrame }) {
  return (
    <iframe
      key={tile.id}
      className={frameEmbedClass(tile.fit, "lightbox")}
      src={tile.src}
      title={tile.alt}
    />
  );
}

function StillStage({
  tile,
  reducedMotion,
}: {
  tile: GalleryImage;
  reducedMotion: boolean;
}) {
  const [snapshot, setSnapshot] = useState<{ id: string; layers: StillLayer[] }>({
    id: tile.id,
    layers: [{ id: tile.id, tile, phase: "in" }],
  });

  if (snapshot.id !== tile.id) {
    setSnapshot({
      id: tile.id,
      layers: pushStill(snapshot.layers, tile, reducedMotion),
    });
  }

  const layers = snapshot.id === tile.id ? snapshot.layers : pushStill(snapshot.layers, tile, reducedMotion);
  const needsReveal = layers.some((layer) => layer.phase === "enter");

  useEffect(() => {
    if (!needsReveal) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setSnapshot((current) => ({
        ...current,
        layers: current.layers.map((layer) =>
          layer.phase === "enter" ? { ...layer, phase: "in" } : layer,
        ),
      }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [needsReveal]);

  useEffect(() => {
    if (!layers.some((layer) => layer.phase === "out")) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSnapshot((current) => ({
        ...current,
        layers: current.layers.filter((layer) => layer.phase !== "out"),
      }));
    }, 420);

    return () => window.clearTimeout(timer);
  }, [layers]);

  return (
    <span className="work-lightbox-stills">
      {layers.map((layer) => (
        <Image
          key={layer.id}
          src={layer.tile.src}
          alt={layer.tile.alt}
          width={layer.tile.width}
          height={layer.tile.height}
          sizes="100vw"
          quality={90}
          loading="eager"
          className="work-lightbox-image work-lightbox-still"
          data-still={layer.id}
          data-phase={layer.phase}
          draggable={false}
          onTransitionEnd={(event) => {
            if (event.propertyName !== "opacity") {
              return;
            }
            if (event.target !== event.currentTarget) {
              return;
            }
            const phase = event.currentTarget.getAttribute("data-phase");
            const id = event.currentTarget.getAttribute("data-still");
            if (phase !== "out" || !id) {
              return;
            }
            setSnapshot((current) => ({
              ...current,
              layers: current.layers.filter((item) => item.id !== id),
            }));
          }}
        />
      ))}
    </span>
  );
}

function LightboxTitle({
  title,
  tileCount,
  onStep,
}: {
  title: string;
  tileCount: number;
  onStep: (delta: number) => void;
}) {
  return (
    <div className="work-lightbox-bar">
      {tileCount > 1 ? (
        <button
          type="button"
          className="work-lightbox-step"
          aria-label="Previous image"
          onClick={() => onStep(-1)}
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
        {title}
      </p>
      {tileCount > 1 ? (
        <button
          type="button"
          className="work-lightbox-step"
          aria-label="Next image"
          onClick={() => onStep(1)}
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
  );
}

function CollectionLightbox({
  tile,
  collectionId,
  reducedMotion,
  chromeOn,
  fading,
  closing,
  onFrame,
  moveRef,
  escapeRef,
  onClose,
  onFadeEnd,
}: {
  tile: GalleryVideo;
  collectionId: CollectionId;
  reducedMotion: boolean;
  chromeOn: boolean;
  fading: boolean;
  closing: boolean;
  onFrame: (node: HTMLSpanElement | null) => void;
  moveRef: { current: CollectionMove };
  escapeRef: { current: CollectionEscape };
  onClose: () => void;
  onFadeEnd: () => void;
}) {
  const [label, setLabel] = useState(tile.title);
  const [caption, setCaption] = useState("");
  const [live, setLive] = useState("");
  const liveTimer = useRef<number | null>(null);
  const chromeTransition = {
    duration: reducedMotion ? 0.18 : chromeOn ? 0.18 : 0.14,
    delay: !reducedMotion && chromeOn ? 0.08 : 0,
    ease: SHARED_EASE,
  };

  const onLabel = useCallback((name: string, nextCaption: string) => {
    setLabel(name);
    setCaption(nextCaption);
    if (liveTimer.current != null) {
      window.clearTimeout(liveTimer.current);
    }
    liveTimer.current = window.setTimeout(() => {
      setLive(`${name}. ${nextCaption}`);
    }, 280);
  }, []);

  useEffect(() => {
    return () => {
      if (liveTimer.current != null) {
        window.clearTimeout(liveTimer.current);
      }
    };
  }, []);

  return (
    <motion.div
      className="work-lightbox-layout"
      data-collection=""
      initial={false}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{
        duration: reducedMotion ? 0.18 : 0,
        ease: SHARED_EASE,
      }}
      onAnimationComplete={() => {
        if (fading) {
          onFadeEnd();
        }
      }}
    >
      <motion.button
        type="button"
        className="work-lightbox-close"
        aria-label="Close"
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeOn ? 1 : 0 }}
        transition={chromeTransition}
        style={{ pointerEvents: chromeOn ? "auto" : "none" }}
        onClick={onClose}
      >
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={18}
          strokeWidth={1.5}
          color="currentColor"
          aria-hidden="true"
        />
      </motion.button>
      <CollectionLens
        key={tile.id}
        id={collectionId}
        poster={tile.poster}
        fallbackTitle={tile.title}
        reducedMotion={reducedMotion}
        revealed={chromeOn || reducedMotion}
        closing={closing}
        onFrame={onFrame}
        moveRef={moveRef}
        escapeRef={escapeRef}
        onLabel={onLabel}
      />
      <motion.div
        className="work-lightbox-chrome"
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeOn ? 1 : 0 }}
        transition={chromeTransition}
        style={{ pointerEvents: chromeOn ? "auto" : "none" }}
      >
        <div className="work-lightbox-bar">
          <div className="collection-readout">
            <p id="work-lightbox-title" className="work-lightbox-title">
              {label}
            </p>
            {caption ? <p className="collection-caption">{caption}</p> : null}
          </div>
          <p className="collection-live" aria-live="polite">
            {live}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LightboxView({
  tile,
  reducedMotion,
  tileCount,
  chromeOn,
  fading,
  closing,
  frameRef,
  onFrame,
  moveRef,
  escapeRef,
  onStep,
  onClose,
  onFadeEnd,
}: {
  tile: GalleryItem;
  reducedMotion: boolean;
  tileCount: number;
  chromeOn: boolean;
  fading: boolean;
  closing: boolean;
  frameRef: Ref<HTMLSpanElement>;
  onFrame: (node: HTMLSpanElement | null) => void;
  moveRef: { current: CollectionMove };
  escapeRef: { current: CollectionEscape };
  onStep: (delta: number) => void;
  onClose: () => void;
  onFadeEnd: () => void;
}) {
  const collectionId = collectionForGallery(tile.id);
  if (collectionId && tile.media === "video") {
    return (
      <CollectionLightbox
        key={tile.id}
        tile={tile}
        collectionId={collectionId}
        reducedMotion={reducedMotion}
        chromeOn={chromeOn}
        fading={fading}
        closing={closing}
        onFrame={onFrame}
        moveRef={moveRef}
        escapeRef={escapeRef}
        onClose={onClose}
        onFadeEnd={onFadeEnd}
      />
    );
  }

  const mark = isGalleryMark(tile);
  const chromeTransition = {
    duration: reducedMotion ? 0.18 : chromeOn ? 0.18 : 0.14,
    delay: !reducedMotion && chromeOn ? 0.08 : 0,
    ease: SHARED_EASE,
  };
  const frameStyle = {
    "--lightbox-w": tile.width,
    "--lightbox-h": tile.height,
    borderRadius: mark ? 0 : 16,
  } as CSSProperties;
  const frameClass = mark
    ? "work-lightbox-frame work-lightbox-mark"
    : "work-lightbox-frame";

  return (
    <motion.div
      className="work-lightbox-layout"
      initial={false}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{
        duration: reducedMotion ? 0.18 : 0,
        ease: SHARED_EASE,
      }}
      onAnimationComplete={() => {
        if (fading) {
          onFadeEnd();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.button
        type="button"
        className="work-lightbox-close"
        aria-label="Close"
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeOn ? 1 : 0 }}
        transition={chromeTransition}
        style={{ pointerEvents: chromeOn ? "auto" : "none" }}
        onClick={onClose}
      >
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={18}
          strokeWidth={1.5}
          color="currentColor"
          aria-hidden="true"
        />
      </motion.button>
      <figure
        className="work-lightbox-figure"
        data-media={tile.media}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <span
          ref={frameRef}
          className={frameClass}
          data-media={tile.media}
          data-fit={tile.media === "frame" ? tile.fit : undefined}
          style={frameStyle}
        >
          {tile.media === "image" ? (
            <StillStage tile={tile} reducedMotion={reducedMotion} />
          ) : tile.media === "video" ? (
            <LightboxPlayer
              key={tile.id}
              tile={tile}
              reducedMotion={reducedMotion}
            />
          ) : (
            <LightboxEmbed tile={tile} />
          )}
        </span>
      </figure>
      <motion.div
        className="work-lightbox-chrome"
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeOn ? 1 : 0 }}
        transition={chromeTransition}
        style={{ pointerEvents: chromeOn ? "auto" : "none" }}
      >
        <LightboxTitle
          title={tile.title}
          tileCount={tileCount}
          onStep={onStep}
        />
      </motion.div>
    </motion.div>
  );
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
  const [heldId, setHeldId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [chromeOn, setChromeOn] = useState(false);
  const [frameReady, setFrameReady] = useState(0);
  const closingRef = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const finishCloseRef = useRef<() => void>(() => {});
  const frameRef = useRef<HTMLSpanElement>(null);
  const collectionMoveRef = useRef<CollectionMove>(() => {});
  const collectionEscapeRef = useRef<CollectionEscape>(() => false);
  const flipRef = useRef<Animation | null>(null);
  const originRef = useRef<Box | null>(null);
  const onFrame = useCallback((node: HTMLSpanElement | null) => {
    frameRef.current = node;
    if (node && originRef.current) {
      setFrameReady((value) => value + 1);
    }
  }, []);
  const entranceStarted = useRef(false);
  const fullscreenGuard = useRef(false);

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
    const onFullscreen = () => {
      if (document.fullscreenElement) {
        fullscreenGuard.current = false;
        return;
      }

      fullscreenGuard.current = true;
      window.setTimeout(() => {
        fullscreenGuard.current = false;
      }, 80);
    };

    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) {
      return;
    }

    const videos = [
      ...root.querySelectorAll<HTMLVideoElement>("video.work-masonry-video"),
    ];
    const pause = (video: HTMLVideoElement) => {
      video.pause();
    };

    if (reducedMotion || openIndex != null) {
      videos.forEach(pause);
      return;
    }

    let active = true;
    const observer = new IntersectionObserver(
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

          void video.play().then(() => {
            if (!active) {
              video.pause();
            }
          }).catch(() => undefined);
        }
      },
      { rootMargin: VIDEO_ROOT_MARGIN, threshold: 0 },
    );

    videos.forEach((video) => observer.observe(video));
    return () => {
      active = false;
      observer.disconnect();
      videos.forEach(pause);
    };
  }, [reducedMotion, openIndex, tiles]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const grid = gridRef.current;
    if (!grid) {
      return;
    }

    const cards = () => [
      ...grid.querySelectorAll<HTMLElement>(".work-masonry-card"),
    ];
    const markFade = (card: HTMLElement) => {
      if (!card.dataset.enter) {
        card.dataset.enter = "fade";
      }
    };
    const onAnimationEnd = (event: globalThis.AnimationEvent) => {
      const card = event.target;
      if (!(card instanceof HTMLElement) || !card.classList.contains("work-masonry-card")) {
        return;
      }
      if (
        event.animationName !== "work-masonry-rise" &&
        event.animationName !== "work-masonry-fade"
      ) {
        return;
      }
      card.dataset.enter = "settled";
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entranceStarted.current) {
          if (!entries.some((entry) => entry.isIntersecting)) {
            return;
          }

          entranceStarted.current = true;
          const visible = cards().filter((card) => isOnScreen(card));
          visible.forEach((card, index) => {
            if (index < ENTER_LIMIT) {
              card.style.setProperty("--enter-i", String(index));
              card.dataset.enter = "stagger";
              return;
            }
            card.dataset.enter = "fade";
          });
          grid.dataset.entrance = "armed";
          return;
        }

        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
            continue;
          }
          markFade(entry.target);
        }
      },
      { threshold: 0.01 },
    );

    grid.addEventListener("animationend", onAnimationEnd);
    cards().forEach((card) => observer.observe(card));
    return () => {
      observer.disconnect();
      grid.removeEventListener("animationend", onAnimationEnd);
    };
  }, [reducedMotion, tiles]);

  useLayoutEffect(() => {
    const origin = originRef.current;
    const frame = frameRef.current;
    if (!origin || !frame || reducedMotion || closingRef.current) {
      return;
    }

    originRef.current = null;
    flipRef.current?.cancel();
    const laidOut = toBox(frame.getBoundingClientRect());
    flipRef.current = playSharedFlip(frame, origin, laidOut, true, () => {
      flipRef.current = null;
      if (!closingRef.current) {
        setChromeOn(true);
      }
    });
  }, [openIndex, reducedMotion, frameReady]);

  useLayoutEffect(() => {
    if (!closing || reducedMotion) {
      return;
    }

    const frame = frameRef.current;
    const gridFrame =
      heldId == null
        ? null
        : gridRef.current?.querySelector<HTMLElement>(
            `[data-tile-id="${CSS.escape(heldId)}"]`,
          );
    if (!frame || !gridFrame) {
      finishCloseRef.current();
      return;
    }

    const from = toBox(frame.getBoundingClientRect());
    flipRef.current?.cancel();
    const to = toBox(gridFrame.getBoundingClientRect());
    flipRef.current = playSharedFlip(frame, from, to, false, () => {
      flipRef.current = null;
      finishCloseRef.current();
    });
  }, [closing, heldId, reducedMotion]);

  const finishClose = useCallback(() => {
    if (!closingRef.current) {
      return;
    }

    closingRef.current = false;
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setClosing(false);
    setOpenIndex(null);
    setHeldId(null);
    setChromeOn(false);
    originRef.current = null;
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  }, []);

  useLayoutEffect(() => {
    finishCloseRef.current = finishClose;
  }, [finishClose]);

  if (tiles.length === 0) {
    return null;
  }

  const openTile = openIndex == null ? null : tiles[openIndex] ?? null;

  const openAt = (index: number) => {
    if (closingRef.current) {
      return;
    }

    const tile = tiles[index];
    const collectionId = collectionForGallery(tile?.id);
    if (collectionId) {
      prefetchCollection(collectionId);
      void loadCollectionLens();
    }
    const source = gridRef.current?.querySelector<HTMLElement>(
      `[data-tile-id="${CSS.escape(tile?.id ?? "")}"]`,
    );
    // Measure before showModal. Opening the dialog locks document scroll,
    // and the shared-element flight needs the tile's box from this frame.
    originRef.current =
      reducedMotion || !source ? null : toBox(source.getBoundingClientRect());

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    setChromeOn(reducedMotion);
    setHeldId(reducedMotion || !tile ? null : tile.id);
    setOpenIndex(index);
  };

  const requestClose = () => {
    if (openIndex == null || closingRef.current) {
      return;
    }

    leaveLightboxFullscreen(dialogRef.current);
    setChromeOn(false);
    closingRef.current = true;
    setClosing(true);
    closeTimer.current = window.setTimeout(finishClose, 700);
  };

  const step = (delta: number) => {
    if (openIndex == null || closingRef.current || tiles.length < 2) {
      return;
    }

    const next = (openIndex + delta + tiles.length) % tiles.length;
    const tile = tiles[next];
    originRef.current = null;
    flipRef.current?.cancel();
    flipRef.current = null;
    if (frameRef.current) {
      clearFlip(frameRef.current);
    }
    setChromeOn(true);
    setOpenIndex(next);
    setHeldId(reducedMotion || !tile ? null : tile.id);
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (
      event.key === "Escape" &&
      (document.fullscreenElement || fullscreenGuard.current)
    ) {
      event.preventDefault();
      event.stopPropagation();
      leaveLightboxFullscreen(dialogRef.current);
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(".work-lightbox-transport")
    ) {
      return;
    }

    if (collectionForGallery(openTile?.id)) {
      const column =
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      const row =
        event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (column !== 0 || row !== 0) {
        event.preventDefault();
        collectionMoveRef.current(column, row);
        return;
      }
    }

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
      <section className="work-masonry" aria-labelledby="work-gallery-heading">
        <div className="work-section-head">
          <h2 id="work-gallery-heading" className="work-section-title">
            Work
          </h2>
        </div>
        <div className="work-masonry-body">
          <div
            ref={gridRef}
            className="work-masonry-grid"
            style={gridStyle}
          >
          {tiles.map((tile, index) => {
            const cardStyle = {
              gridRow: `span ${rowSpan(tile, layout.columnWidth)}`,
            } as CSSProperties;
            const mark = isGalleryMark(tile);
            const held = heldId === tile.id;
            const collectionId = collectionForGallery(tile.id);
            const warm = collectionId
              ? () => {
                  prefetchCollection(collectionId);
                  void loadCollectionLens();
                }
              : undefined;
            const surface = (
              <span
                className="work-masonry-shell"
                data-held={held ? "true" : undefined}
              >
                <span
                  data-tile-id={tile.id}
                  className={
                    mark
                      ? "work-masonry-frame work-masonry-mark"
                      : "work-masonry-frame"
                  }
                  style={{
                    borderRadius: mark ? 0 : 16,
                    ...(tile.media === "image" && tile.pad != null
                      ? { containerType: "size" as const }
                      : {}),
                  }}
                >
                  <TileVisual tile={tile} eager={index < layout.columns} />
                </span>
                {tile.media === "frame" ? (
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
                ) : (
                  <span className="work-masonry-verb">
                    <TileLabel title={tile.title} />
                  </span>
                )}
              </span>
            );

            if (tile.media === "frame") {
              return (
                <div
                  key={tile.id}
                  className="work-masonry-card"
                  style={cardStyle}
                >
                  {surface}
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
                onPointerEnter={warm}
                onFocus={warm}
                onTouchStart={warm}
              >
                {surface}
              </button>
            );
          })}
          </div>
        </div>
        <dialog
          ref={dialogRef}
          id="work-lightbox"
          className="work-lightbox"
          aria-labelledby="work-lightbox-title"
          onCancel={(event) => {
            event.preventDefault();
            if (document.fullscreenElement || fullscreenGuard.current) {
              leaveLightboxFullscreen(dialogRef.current);
              return;
            }
            if (collectionForGallery(openTile?.id) && collectionEscapeRef.current()) {
              return;
            }
            requestClose();
          }}
          onClose={() => {
            closingRef.current = false;
            setClosing(false);
            setOpenIndex(null);
            setHeldId(null);
            setChromeOn(false);
          }}
          onKeyDown={onDialogKeyDown}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestClose();
            }
          }}
        >
          {openTile ? (
            <LightboxView
              tile={openTile}
              reducedMotion={reducedMotion}
              tileCount={tiles.length}
              chromeOn={chromeOn}
              fading={reducedMotion && closing}
              closing={closing}
              frameRef={frameRef}
              onFrame={onFrame}
              moveRef={collectionMoveRef}
              escapeRef={collectionEscapeRef}
              onStep={step}
              onClose={requestClose}
              onFadeEnd={finishClose}
            />
          ) : null}
        </dialog>
        {openTile
          ? createPortal(
              <motion.div
                className="work-lightbox-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: closing ? 0 : 1 }}
                transition={{
                  duration: reducedMotion ? 0.18 : 0.26,
                  ease: SHARED_EASE,
                }}
                onClick={requestClose}
              />,
              document.body,
            )
          : null}
      </section>
  );
}
