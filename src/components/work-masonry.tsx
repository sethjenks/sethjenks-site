"use client";

import {
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";
import type { GalleryImage, GalleryItem, GalleryVideo } from "@/lib/gallery";

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

function VideoTransport({
  playing,
  muted,
  duration,
  current,
  onTogglePlay,
  onToggleMute,
  onSeek,
}: {
  playing: boolean;
  muted: boolean;
  duration: number;
  current: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (seconds: number) => void;
}) {
  const seekable = duration > 0;
  const progress = seekable ? Math.min(100, (current / duration) * 100) : 0;
  const elapsed = clockLabel(current);
  const total = clockLabel(duration);

  return (
    <div
      className="work-lightbox-transport"
      role="group"
      aria-label="Playback"
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
        onClick={onTogglePlay}
      >
        <HugeiconsIcon
          icon={playing ? PauseIcon : PlayIcon}
          size={18}
          strokeWidth={1.5}
          color="currentColor"
          aria-hidden="true"
        />
      </button>
      <input
        className="work-lightbox-seek"
        type="range"
        min={0}
        max={seekable ? duration : 0}
        step={0.1}
        value={seekable ? Math.min(current, duration) : 0}
        disabled={!seekable}
        aria-label="Seek"
        aria-valuetext={`${elapsed} of ${total}`}
        style={{ "--seek": `${progress}%` } as CSSProperties}
        onChange={(event) => {
          onSeek(Number(event.currentTarget.value));
        }}
      />
      <span className="work-lightbox-time">
        <span className="play-a11y">Elapsed</span>
        {elapsed}
        <span aria-hidden="true"> / </span>
        <span className="play-a11y">Duration</span>
        {total}
      </span>
      <button
        type="button"
        className="work-lightbox-step"
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={onToggleMute}
      >
        <HugeiconsIcon
          icon={muted ? VolumeOffIcon : VolumeHighIcon}
          size={18}
          strokeWidth={1.5}
          color="currentColor"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function LightboxVisual({
  tile,
  reducedMotion,
  videoRef,
  onVideoPlay,
  onVideoPause,
  onVideoTime,
  onVideoDuration,
  onVideoVolume,
}: {
  tile: GalleryItem;
  reducedMotion: boolean;
  videoRef?: Ref<HTMLVideoElement>;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoTime?: (seconds: number) => void;
  onVideoDuration?: (seconds: number) => void;
  onVideoVolume?: (muted: boolean) => void;
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
          ref={videoRef}
          className="work-lightbox-image"
          src={tile.src}
          poster={tile.poster}
          aria-label={tile.alt}
          autoPlay={!reducedMotion}
          loop
          muted
          playsInline
          preload={reducedMotion ? "none" : "metadata"}
          onPlay={onVideoPlay}
          onPause={onVideoPause}
          onTimeUpdate={(event) => {
            onVideoTime?.(event.currentTarget.currentTime);
          }}
          onLoadedMetadata={(event) => {
            const next = event.currentTarget.duration;
            onVideoDuration?.(Number.isFinite(next) ? next : 0);
          }}
          onDurationChange={(event) => {
            const next = event.currentTarget.duration;
            onVideoDuration?.(Number.isFinite(next) ? next : 0);
          }}
          onVolumeChange={(event) => {
            onVideoVolume?.(event.currentTarget.muted);
          }}
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

function LightboxView({
  tile,
  reducedMotion,
  tileCount,
  chromeOn,
  fading,
  frameRef,
  onStep,
  onClose,
  onFadeEnd,
}: {
  tile: GalleryItem;
  reducedMotion: boolean;
  tileCount: number;
  chromeOn: boolean;
  fading: boolean;
  frameRef: Ref<HTMLSpanElement>;
  onStep: (delta: number) => void;
  onClose: () => void;
  onFadeEnd: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().catch(() => setPlaying(false));
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

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    const next = Math.min(Math.max(seconds, 0), video.duration);
    video.currentTime = next;
    setCurrent(next);
  };

  const [playbackTile, setPlaybackTile] = useState(tile.id);
  if (playbackTile !== tile.id) {
    setPlaybackTile(tile.id);
    setPlaying(false);
    setMuted(true);
    setDuration(0);
    setCurrent(0);
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
          ) : (
            <LightboxVisual
              tile={tile}
              reducedMotion={reducedMotion}
              videoRef={tile.media === "video" ? videoRef : undefined}
              onVideoPlay={() => setPlaying(true)}
              onVideoPause={() => setPlaying(false)}
              onVideoTime={setCurrent}
              onVideoDuration={setDuration}
              onVideoVolume={setMuted}
            />
          )}
        </span>
        {tile.media === "video" ? (
          <motion.div
            className="work-lightbox-transport-slot"
            initial={{ opacity: 0 }}
            animate={{ opacity: chromeOn ? 1 : 0 }}
            transition={chromeTransition}
            style={{ pointerEvents: chromeOn ? "auto" : "none" }}
          >
            <VideoTransport
              playing={playing}
              muted={muted}
              duration={duration}
              current={current}
              onTogglePlay={togglePlay}
              onToggleMute={toggleMute}
              onSeek={seek}
            />
          </motion.div>
        ) : null}
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
  const closingRef = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const finishCloseRef = useRef<() => void>(() => {});
  const frameRef = useRef<HTMLSpanElement>(null);
  const flipRef = useRef<Animation | null>(null);
  const originRef = useRef<Box | null>(null);
  const entranceStarted = useRef(false);

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
  }, [openIndex, reducedMotion]);

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

  if (tiles.length === 0) {
    return null;
  }

  const openTile = openIndex == null ? null : tiles[openIndex] ?? null;

  const finishClose = () => {
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
  };

  finishCloseRef.current = finishClose;

  const openAt = (index: number) => {
    if (closingRef.current) {
      return;
    }

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    const tile = tiles[index];
    const source = gridRef.current?.querySelector<HTMLElement>(
      `[data-tile-id="${CSS.escape(tile?.id ?? "")}"]`,
    );
    originRef.current =
      reducedMotion || !source ? null : toBox(source.getBoundingClientRect());
    setChromeOn(reducedMotion);
    setHeldId(reducedMotion || !tile ? null : tile.id);
    setOpenIndex(index);
  };

  const requestClose = () => {
    if (openIndex == null || closingRef.current) {
      return;
    }

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
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(".work-lightbox-transport")
    ) {
      return;
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
      <section className="work-masonry" aria-label="Gallery">
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
              >
                {surface}
              </button>
            );
          })}
        </div>
        <dialog
          ref={dialogRef}
          id="work-lightbox"
          className="work-lightbox"
          aria-labelledby="work-lightbox-title"
          onCancel={(event) => {
            event.preventDefault();
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
          <motion.div
            className="work-lightbox-scrim"
            initial={false}
            animate={{ opacity: openTile && !closing ? 1 : 0 }}
            transition={{
              duration: reducedMotion ? 0.18 : 0.26,
              ease: SHARED_EASE,
            }}
          />
          {openTile ? (
            <LightboxView
              tile={openTile}
              reducedMotion={reducedMotion}
              tileCount={tiles.length}
              chromeOn={chromeOn}
              fading={reducedMotion && closing}
              frameRef={frameRef}
              onStep={step}
              onClose={requestClose}
              onFadeEnd={finishClose}
            />
          ) : null}
        </dialog>
      </section>
  );
}
