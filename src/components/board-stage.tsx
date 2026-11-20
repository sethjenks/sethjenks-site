"use client";

import { ArrowShrink01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import type { CollectionMove } from "@/components/collection-lens";
import type { HomeCard } from "@/lib/home";

const OPEN_MS = 300;
const CLOSE_MS = 220;
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const REST = "translate(0px, 0px) scale(1, 1)";

function loadCollectionLens() {
  return import("@/components/collection-lens");
}

const CollectionLens = dynamic(
  () => loadCollectionLens().then((mod) => mod.CollectionLens),
  { ssr: false },
);

type BoardStageProps = {
  card: HomeCard;
  origin: HTMLElement;
  onClose: () => void;
  onRelease?: () => void;
};

type ProjectOpening = Extract<HomeCard["opening"], { kind: "project" }>;

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ProjectLayout = {
  coverScale: number;
  placed: Box;
};

export function BoardStage({ card, origin, onClose, onRelease }: BoardStageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const layoutRef = useRef<ProjectLayout | null>(null);
  const flightsRef = useRef<Animation[]>([]);
  const closingRef = useRef(false);
  const finishedRef = useRef(false);
  const fullscreenGuard = useRef(false);
  const onCloseRef = useRef(onClose);
  const onReleaseRef = useRef(onRelease);
  const closeRef = useRef<() => void>(() => {});
  const moveRef = useRef<CollectionMove>(() => {});
  const escapeRef = useRef<() => boolean>(() => false);
  const [settled, setSettled] = useState(false);
  const [closing, setClosing] = useState(false);
  const opening = card.opening;

  useEffect(() => {
    onCloseRef.current = onClose;
    onReleaseRef.current = onRelease;
  }, [onClose, onRelease]);

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
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const finish = () => {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      if (dialog.open) {
        dialog.close();
      }
      onCloseRef.current();
    };

    closeRef.current = () => {
      if (closingRef.current || finishedRef.current) {
        return;
      }

      closingRef.current = true;
      setClosing(true);
      onReleaseRef.current?.();
      delete dialog.dataset.open;
      delete dialog.dataset.settled;
      dialog.dataset.closing = "true";

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !origin.isConnected) {
        finish();
        return;
      }

      if (opening.kind === "project") {
        if (imageRef.current) {
          imageRef.current.scrollTop = 0;
        }
        closeProject({
          origin,
          frame: frameRef.current,
          cover: coverRef.current,
          layout: layoutRef.current,
          flights: flightsRef,
          finish,
        });
        return;
      }

      const frame = frameRef.current;
      const laidOut = frame?.getBoundingClientRect();
      if (!frame || !laidOut || laidOut.width < 1 || laidOut.height < 1) {
        finish();
        return;
      }

      const current = getComputedStyle(frame).transform;
      cancelFlights(flightsRef);
      const start = current === "none" ? REST : current;
      frame.style.transformOrigin = "top left";
      frame.style.transform = start;
      const animation = frame.animate(
        [{ transform: start }, { transform: flipTransform(toBox(origin.getBoundingClientRect()), toBox(laidOut)) }],
        { duration: CLOSE_MS, easing: EASE, fill: "forwards" },
      );
      flightsRef.current = [animation];
      const backup = window.setTimeout(finish, CLOSE_MS + 80);
      animation.onfinish = () => {
        window.clearTimeout(backup);
        finish();
      };
    };

    let consumed = false;
    const onEscape = () => {
      if (consumed || finishedRef.current) {
        return;
      }
      consumed = true;
      window.setTimeout(() => {
        consumed = false;
      }, 0);

      if (document.fullscreenElement || fullscreenGuard.current) {
        void document.exitFullscreen().catch(() => {});
        return;
      }
      closeRef.current();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat || isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onEscape();
    };

    const onCancel = (event: Event) => {
      event.preventDefault();
      onEscape();
    };

    const unbindFrames = bindFrameEscape(dialog, onKey);
    dialog.addEventListener("cancel", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      window.removeEventListener("keydown", onKey);
      unbindFrames();
      cancelFlights(flightsRef);
    };
  }, [opening.kind, origin]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const frame = frameRef.current;
    if (!dialog || !frame) {
      return;
    }
    if (!dialog.open) {
      dialog.showModal();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (opening.kind === "project") {
      return openProject({
        dialog,
        origin,
        frame: frameRef.current,
        cover: coverRef.current,
        layoutRef,
        flightsRef,
        reduce,
        settle: () => setSettled(true),
        closingRef,
      });
    }

    const laidOut = frame.getBoundingClientRect();
    if (reduce || laidOut.width < 1 || laidOut.height < 1) {
      dialog.dataset.open = "true";
      dialog.dataset.settled = "true";
      setSettled(true);
      return;
    }

    const from = flipTransform(toBox(origin.getBoundingClientRect()), toBox(laidOut));
    frame.style.transformOrigin = "top left";
    frame.style.transform = from;
    const animation = frame.animate([{ transform: from }, { transform: REST }], {
      duration: OPEN_MS,
      easing: EASE,
      fill: "forwards",
    });
    flightsRef.current = [animation];
    animation.onfinish = () => {
      if (closingRef.current) {
        return;
      }
      frame.style.transform = "";
      animation.cancel();
      dialog.dataset.settled = "true";
      setSettled(true);
    };
    const frameId = requestAnimationFrame(() => {
      if (!closingRef.current) {
        dialog.dataset.open = "true";
      }
    });
    return () => {
      cancelAnimationFrame(frameId);
      animation.cancel();
    };
  }, [opening.kind, origin]);

  return (
    <dialog
      ref={dialogRef}
      className="board-stage"
      aria-label={card.label}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeRef.current();
        }
      }}
      onKeyDown={(event) => {
        if (opening.kind !== "collection" || closing) {
          return;
        }
        const column = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const row = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (column === 0 && row === 0) {
          return;
        }
        const target = event.target;
        if (target instanceof Element && target.closest("video, iframe, input, textarea")) {
          return;
        }
        event.preventDefault();
        moveRef.current(column, row);
      }}
    >
      <div className="board-stage-scrim" onClick={() => closeRef.current()} />
      {opening.kind === "project" ? null : (
        <button
          type="button"
          className="board-stage-close"
          aria-label="Close"
          onClick={() => closeRef.current()}
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={16}
            strokeWidth={1.5}
            color="currentColor"
            aria-hidden="true"
          />
        </button>
      )}
      {opening.kind === "project" ? (
        <div ref={frameRef} className="board-stage-frame" data-kind="project">
          <div ref={shellRef} className="board-project-shell" />
          {/* The tile still expands on its own. The study underneath waits until it has filled the screen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={coverRef}
            className="board-project-cover-flight"
            src={opening.preview.src}
            alt=""
          />
          <div className="board-project-open-bar">
            <div className="board-project-open-lead">
              <span ref={titleRef} className="board-project-title board-project-chrome">
                {card.label}
              </span>
              <div className="board-project-pills board-project-chrome">
                {projectPills(opening).map((pill) => (
                  <span className="board-project-pill" key={pill}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="board-project-contract board-project-chrome"
              aria-label="Close"
              onClick={() => closeRef.current()}
            >
              <HugeiconsIcon
                icon={ArrowShrink01Icon}
                size={24}
                strokeWidth={1.5}
                color="currentColor"
                aria-hidden="true"
              />
            </button>
          </div>
          <div ref={imageRef} className="board-project-well">
            <ProjectBody opening={opening} />
          </div>
        </div>
      ) : (
        <div
          ref={frameRef}
          className="board-stage-frame"
          data-fit={opening.kind === "collection" ? "fill" : "media"}
          data-kind={opening.kind}
          style={stageSize(opening)}
        >
          <StageBody
            card={card}
            settled={settled}
            closing={closing}
            moveRef={moveRef}
            escapeRef={escapeRef}
          />
        </div>
      )}
    </dialog>
  );
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

function bindFrameEscape(dialog: HTMLDialogElement, onKey: (event: KeyboardEvent) => void) {
  const unbind: Array<() => void> = [];
  for (const iframe of dialog.querySelectorAll("iframe")) {
    let bound: Window | null = null;
    const attach = () => {
      if (bound) {
        bound.removeEventListener("keydown", onKey, true);
        bound = null;
      }
      try {
        const frameWindow = iframe.contentWindow;
        if (!frameWindow) {
          return;
        }
        frameWindow.addEventListener("keydown", onKey, true);
        bound = frameWindow;
      } catch {
        bound = null;
      }
    };
    iframe.addEventListener("load", attach);
    attach();
    unbind.push(() => {
      iframe.removeEventListener("load", attach);
      bound?.removeEventListener("keydown", onKey, true);
    });
  }
  return () => {
    for (const release of unbind) {
      release();
    }
  };
}

function stageSize(opening: HomeCard["opening"]): CSSProperties | undefined {
  if (opening.kind !== "video" && opening.kind !== "image" && opening.kind !== "frame") {
    return undefined;
  }
  return {
    "--stage-w": opening.width,
    "--stage-h": opening.height,
  } as CSSProperties;
}

function StageBody({
  card,
  settled,
  closing,
  moveRef,
  escapeRef,
}: {
  card: HomeCard;
  settled: boolean;
  closing: boolean;
  moveRef: { current: CollectionMove };
  escapeRef: { current: () => boolean };
}) {
  const opening = card.opening;
  const reduce = useReducedFlag();

  switch (opening.kind) {
    case "video":
      return (
        <video
          src={opening.src}
          poster={opening.poster}
          controls
          playsInline
          autoPlay={!reduce}
          loop={!reduce}
          muted={reduce}
        />
      );
    case "image":
      return (
        // Marks include SVG, which the image optimizer does not own.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={opening.src} alt={opening.alt} />
      );
    case "frame":
      return (
        <iframe
          src={opening.src}
          title={opening.title}
          tabIndex={settled ? 0 : -1}
          sandbox="allow-scripts allow-same-origin"
        />
      );
    case "project":
      return null;
    case "slot":
      return null;
    case "collection":
      return (
        <CollectionLens
          id={opening.id}
          poster={opening.poster}
          fallbackTitle={opening.title}
          reducedMotion={reduce}
          revealed={settled || reduce}
          closing={closing}
          onFrame={() => {}}
          moveRef={moveRef}
          escapeRef={escapeRef}
          onLabel={() => {}}
        />
      );
    default: {
      const unreachable: never = opening;
      return unreachable;
    }
  }
}

function ProjectBody({ opening }: { opening: ProjectOpening }) {
  if (opening.plates.length === 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="board-project-cover" src={opening.still.src} alt={opening.still.alt} />
    );
  }

  return (
    <div className="study-scroll">
      <section className="mosaic-statement">
        <p className="board-project-statement">{opening.statement}</p>
        <div className="mosaic-statement-copy">
          <p className="mosaic-summary">{opening.summary}</p>
        </div>
      </section>
      {opening.plates.map((plate) => (
        <Plate key={`${plate.label}-${plate.src}`} plate={plate} />
      ))}
    </div>
  );
}

function Plate({ plate }: { plate: ProjectOpening["plates"][number] }) {
  return (
    <figure className="study-scroll-plate">
      <Image
        src={plate.src}
        alt={plate.alt}
        width={plate.width}
        height={plate.height}
        sizes="(max-width: 720px) 100vw, 1280px"
        style={{ width: "100%", height: "auto" }}
      />
      <figcaption className="mosaic-plate-label">{plate.label}</figcaption>
    </figure>
  );
}

function projectPills(opening: ProjectOpening) {
  const seen = new Set<string>();
  const pills: string[] = [];
  for (const value of [opening.year, opening.role, ...opening.tags]) {
    const label = value.trim();
    const key = label.toLowerCase();
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    pills.push(label);
  }
  return pills;
}

function useReducedFlag() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function toBox(rect: DOMRect): Box {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function flipTransform(origin: Box, laidOut: Box) {
  const scaleX = origin.width / laidOut.width;
  const scaleY = origin.height / laidOut.height;
  const x = origin.left - laidOut.left;
  const y = origin.top - laidOut.top;
  return `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`;
}

function cancelFlights(flights: { current: Animation[] }) {
  for (const animation of flights.current) {
    animation.cancel();
  }
  flights.current = [];
}

function openProject({
  dialog,
  origin,
  frame,
  cover,
  layoutRef,
  flightsRef,
  reduce,
  settle,
  closingRef,
}: {
  dialog: HTMLDialogElement;
  origin: HTMLElement;
  frame: HTMLDivElement | null;
  cover: HTMLImageElement | null;
  layoutRef: { current: ProjectLayout | null };
  flightsRef: { current: Animation[] };
  reduce: boolean;
  settle: () => void;
  closingRef: { current: boolean };
}) {
  const frameBox = frame?.getBoundingClientRect();
  const card = toBox(origin.getBoundingClientRect());
  if (!frame || !cover || !frameBox || card.width < 1 || card.height < 1) {
    dialog.dataset.open = "true";
    dialog.dataset.settled = "true";
    settle();
    return;
  }

  const placed = {
    left: card.left - frameBox.left,
    top: card.top - frameBox.top,
    width: card.width,
    height: card.height,
  };
  const scale = coverScale(card, toBox(frameBox));
  layoutRef.current = { coverScale: scale, placed };
  cover.style.left = `${placed.left}px`;
  cover.style.top = `${placed.top}px`;
  cover.style.width = `${placed.width}px`;
  cover.style.height = `${placed.height}px`;
  cover.style.transformOrigin = "center center";

  if (reduce) {
    dialog.dataset.open = "true";
    dialog.dataset.settled = "true";
    settle();
    return;
  }

  const grown = `scale(${scale})`;
  cover.style.transform = "scale(1)";
  const animation = cover.animate([{ transform: "scale(1)" }, { transform: grown }], {
    duration: OPEN_MS,
    easing: EASE,
    fill: "forwards",
  });
  flightsRef.current = [animation];
  animation.onfinish = () => {
    if (closingRef.current) {
      return;
    }
    cover.style.transform = grown;
    cancelFlights(flightsRef);
    dialog.dataset.settled = "true";
    settle();
  };
  const frameId = requestAnimationFrame(() => {
    if (!closingRef.current) {
      dialog.dataset.open = "true";
    }
  });
  return () => {
    cancelAnimationFrame(frameId);
    cancelFlights(flightsRef);
  };
}

function closeProject({
  origin,
  frame,
  cover,
  layout,
  flights,
  finish,
}: {
  origin: HTMLElement;
  frame: HTMLDivElement | null;
  cover: HTMLImageElement | null;
  layout: ProjectLayout | null;
  flights: { current: Animation[] };
  finish: () => void;
}) {
  const frameBox = frame?.getBoundingClientRect();
  const card = toBox(origin.getBoundingClientRect());
  if (!frame || !cover || !layout || !frameBox || card.width < 1 || card.height < 1) {
    finish();
    return;
  }

  const start = readTransform(cover, `scale(${layout.coverScale})`);
  cover.style.transformOrigin = "center center";
  cover.style.transform = start;
  cancelFlights(flights);

  const dx = card.left - frameBox.left + card.width / 2 - (layout.placed.left + layout.placed.width / 2);
  const dy = card.top - frameBox.top + card.height / 2 - (layout.placed.top + layout.placed.height / 2);
  const sx = card.width / layout.placed.width;
  const sy = card.height / layout.placed.height;
  const animation = cover.animate(
    [{ transform: start }, { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }],
    { duration: CLOSE_MS, easing: EASE, fill: "forwards" },
  );
  flights.current = [animation];
  const backup = window.setTimeout(finish, CLOSE_MS + 80);
  animation.onfinish = () => {
    window.clearTimeout(backup);
    finish();
  };
}

function coverScale(card: Box, frame: Box) {
  const centerX = card.left + card.width / 2;
  const centerY = card.top + card.height / 2;
  const scaleX = Math.max(
    (2 * (centerX - frame.left)) / card.width,
    (2 * (frame.left + frame.width - centerX)) / card.width,
  );
  const scaleY = Math.max(
    (2 * (centerY - frame.top)) / card.height,
    (2 * (frame.top + frame.height - centerY)) / card.height,
  );
  return Math.max(scaleX, scaleY, 1);
}

function readTransform(node: HTMLElement, rest: string) {
  const current = getComputedStyle(node).transform;
  return current === "none" ? rest : current;
}
