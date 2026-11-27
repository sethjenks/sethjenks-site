"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import { createPortal } from "react-dom";

import { CardInspect, tileInspectSource } from "@/components/board/card-inspect";
import { IconDock, iconDockClosed } from "@/components/icon-dock";
import { IconLens } from "@/components/icon-lens";
import { CardOpenHeader, CARD_OPEN_HEADER } from "@/components/card-open-header";
import { CaseStudyIntro, useCaseIntroOffset } from "@/components/case-study-intro";
import { hasProjectIntro } from "@/lib/project-intro";
import { TileChrome } from "@/components/board/tile-chrome";
import {
  CLOSE_APPEAR_BUFFER_S,
  CLOSED_HOVER_S,
  CLOSED_HOVER_SCALE,
  CLOSE_MOVE_DELAY_S,
  HOVER_EASE,
  MAX_FADE_RING,
  OPEN_SHELL_S,
  moveTransition,
  shellVariants,
  shiftVariants,
  tileVariants,
} from "@/components/board/presentations/motion";
import { placed } from "@/components/board/presentations/stage";
import { revealOnScroll } from "@/components/board/reveal";
import {
  TileFace,
  tileContentRadius,
  tileHasCopy,
  tileHasEmbed,
  tileHasFace,
  tileHasImage,
  tileOpenRadius,
} from "@/components/board/presentations/tile-face";
import type { PresentationFrame, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";
import { tunedContentRadius, type CardTune } from "@/components/card-tune-panel";

const ICON_DOCK_FRAME = placed(iconDockClosed);

export function contentHeight(tiles: PresentationTile[], intro = 0) {
  return tiles.reduce((max, tile) => Math.max(max, tile.y + tile.height), 0) + 64 + intro;
}

export function PresentationShell({
  shellKey,
  study,
  expanded,
  reduced,
  described,
  setDescribed,
  lensOn,
  dockOn,
  tune,
  onToggle,
  onClose,
  openFrame,
}: {
  shellKey: string;
  study: PresentationSpec;
  expanded: boolean;
  reduced: boolean;
  described: string | null;
  setDescribed: Dispatch<SetStateAction<string | null>>;
  lensOn: boolean;
  dockOn: boolean;
  tune: CardTune;
  onToggle: () => void;
  onClose: () => void;
  openFrame?: PresentationFrame;
}) {
  const [armed, setArmed] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  const ignoreClick = useRef(0);
  const masked = tune.masked;
  const cardName = study.tiles.find((tile) => tile.resting)?.label ?? study.label;
  const inspectedTile = inspectedId ? study.tiles.find((tile) => tile.id === inspectedId) : null;
  const inspected = inspectedTile ? tileInspectSource(inspectedTile) : null;
  const shellStyle = { "--card-open-header": `${CARD_OPEN_HEADER}px` } as CSSProperties;
  const shell = useMemo(
    () => shellVariants(dockOn ? ICON_DOCK_FRAME : study.closed, openFrame ?? study.open, reduced),
    [dockOn, openFrame, reduced, study.closed, study.open],
  );
  const shift = useMemo(() => {
    const tile = study.tiles.find((item) => item.shiftX !== 0 || item.shiftY !== 0);
    return shiftVariants(tile?.shiftX ?? 0, tile?.shiftY ?? 0, reduced);
  }, [reduced, study.tiles]);
  const fades = useMemo(() => {
    const map = new Map<number, ReturnType<typeof tileVariants>>();
    for (const ring of [1, 2, 3, 4]) {
      map.set(ring, tileVariants(ring, reduced));
    }
    return map;
  }, [reduced]);
  const [appearOpen, setAppearOpen] = useState(expanded);
  if (expanded && !appearOpen) {
    setAppearOpen(true);
  }
  const scrollable = expanded && !lensOn && !dockOn && armed;
  const captionRef = useRef<HTMLDivElement>(null);
  const captionText = useRef("");
  const fineHover = useFineHover();
  const showIntro = hasProjectIntro(study.project);
  const [introNode, setIntroNode] = useState<HTMLDivElement | null>(null);
  const introHeight = useCaseIntroOffset(showIntro && expanded, introNode);
  if ((!expanded || lensOn || dockOn) && armed) {
    setArmed(false);
  }
  if (!expanded && inspectedId) {
    setInspectedId(null);
  }

  useEffect(() => {
    if (expanded) {
      return;
    }

    if (!appearOpen) {
      return;
    }

    const closeMs = Math.round((CLOSE_MOVE_DELAY_S + OPEN_SHELL_S + CLOSE_APPEAR_BUFFER_S) * 1000);
    const id = window.setTimeout(() => setAppearOpen(false), reduced ? 0 : closeMs);
    return () => window.clearTimeout(id);
  }, [appearOpen, expanded, reduced]);

  useEffect(() => {
    if (!expanded || lensOn || dockOn) {
      return;
    }

    const id = window.setTimeout(() => setArmed(true), reduced ? 0 : OPEN_SHELL_S * 1000);
    return () => window.clearTimeout(id);
  }, [dockOn, expanded, lensOn, reduced]);

  useEffect(() => {
    if (expanded && openFrame) {
      shellRef.current?.focus();
    }
  }, [expanded, openFrame]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scrollable || !scroller) {
      return;
    }
    const images = [...scroller.querySelectorAll<HTMLElement>(".card-reveal")];
    return revealOnScroll(images, scroller);
  }, [scrollable, study]);

  return (
    <motion.div
      ref={shellRef}
      key={shellKey}
      className="card-shell"
      style={shellStyle}
      whileHover={
        appearOpen || reduced || !fineHover
          ? undefined
          : {
              scale: CLOSED_HOVER_SCALE,
              transition: { duration: CLOSED_HOVER_S, ease: HOVER_EASE },
            }
      }
      data-scroll={scrollable ? "" : undefined}
      data-leaving={!expanded && appearOpen ? "true" : "false"}
      role={appearOpen ? "group" : "button"}
      tabIndex={0}
      aria-expanded={appearOpen}
      aria-label={appearOpen ? study.project.title : dockOn ? "Expand the dock" : study.openLabel}
      initial="closed"
      animate={expanded ? "open" : "closed"}
      variants={shell}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
          return;
        }

        const scroller = scrollRef.current;
        if (!scrollable || !scroller) {
          return;
        }

        const distance = event.key === "PageDown" || event.key === "PageUp" ? 520 : 96;
        if (event.key === "ArrowDown" || event.key === "PageDown") {
          event.preventDefault();
          scroller.scrollBy({ top: distance });
        } else if (event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          scroller.scrollBy({ top: -distance });
        }
      }}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("[data-card-header]")) {
          return;
        }

        if (performance.now() - ignoreClick.current < 400) {
          return;
        }

        if (performance.now() - lastScroll.current < 120) {
          return;
        }

        const tile = event.target instanceof Element ? event.target.closest(".card-tile") : null;

        if (expanded && tile) {
          const id = tile.getAttribute("data-tile");
          const match = id ? study.tiles.find((item) => item.id === id) : null;
          if (match && tileInspectSource(match)) {
            setInspectedId(match.id);
            return;
          }
          if (id) {
            setDescribed((current) => (current === id ? null : id));
          }
          return;
        }

        // Open only from the closed shell. Collapse via header, Escape, or scrim.
        if (expanded) {
          return;
        }

        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }

        onToggle();
      }}
    >
      {lensOn ? (
        <IconLens
          expanded={expanded}
          reduced={reduced}
          blank={masked && !appearOpen}
          collectionId={study.collection?.id}
          poster={study.collection?.poster}
          onGesture={() => {
            ignoreClick.current = performance.now();
          }}
          onClose={() => {
            ignoreClick.current = performance.now();
            onClose();
          }}
        />
      ) : null}
      {dockOn ? (
        <IconDock
          expanded={expanded}
          reduced={reduced}
          blank={masked && !appearOpen}
          marks={[...new Set(study.tiles.flatMap((tile) => (tile.icon ? [tile.icon.mark] : [])))]}
        />
      ) : null}
      {lensOn || dockOn ? null : (
        <div
          ref={scrollRef}
          className="card-scroll"
          onScroll={() => {
            lastScroll.current = performance.now();
            hideCaption(captionRef.current, captionText);
          }}
          onPointerLeave={() => {
            hideCaption(captionRef.current, captionText);
          }}
          onPointerMove={(event) => {
            if (!fineHover || event.pointerType !== "mouse") {
              return;
            }
            moveCaption(captionRef.current, captionText, event, study.tiles);
          }}
        >
          <motion.div
            className="card-scroll-body"
            initial={false}
            animate={{ y: expanded ? CARD_OPEN_HEADER : 0 }}
            transition={moveTransition(reduced, OPEN_SHELL_S, expanded ? 0 : CLOSE_MOVE_DELAY_S)}
            style={{ height: contentHeight(study.tiles, introHeight) + CARD_OPEN_HEADER }}
          >
            {showIntro && expanded ? (
              <div ref={setIntroNode} className="case-intro-anchor" data-card-header="">
                <CaseStudyIntro project={study.project} />
              </div>
            ) : null}
            {study.tiles.map((tile) => (
              <ShellTile
                key={tile.id}
                tile={tile}
                expanded={expanded}
                appearOpen={appearOpen}
                tune={tune}
                described={described}
                scrollable={scrollable}
                shift={shift}
                fades={fades}
                reduced={reduced}
                introOffset={introHeight}
              />
            ))}
          </motion.div>
        </div>
      )}
      {appearOpen ? (
        <div data-closing={!expanded ? "" : undefined}>
          <CardOpenHeader
            title={study.project.title}
            chips={study.project.chips}
            href={study.project.href}
            onCollapse={() => {
              ignoreClick.current = performance.now();
              onClose();
            }}
          />
        </div>
      ) : (
        <TileChrome label={cardName} titleClassName="card-name" expandClassName="card-expand" />
      )}
      {fineHover && scrollable
        ? createPortal(<div ref={captionRef} className="card-cursor-caption" />, document.body)
        : null}
      {inspected ? <CardInspect source={inspected} onClose={() => setInspectedId(null)} /> : null}
    </motion.div>
  );
}

function useFineHover() {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setFine(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return fine;
}

function hideCaption(node: HTMLDivElement | null, current: { current: string }) {
  current.current = "";
  node?.removeAttribute("data-show");
}

function moveCaption(
  node: HTMLDivElement | null,
  current: { current: string },
  event: ReactPointerEvent<HTMLDivElement>,
  tiles: PresentationTile[],
) {
  if (!node) {
    return;
  }

  const tileEl = event.target instanceof Element ? event.target.closest(".card-tile[data-image]") : null;
  const id = tileEl?.getAttribute("data-tile");
  const text = tiles.find((tile) => tile.id === id)?.description;

  if (!text) {
    hideCaption(node, current);
    return;
  }

  if (current.current !== text) {
    current.current = text;
    node.textContent = text;
  }

  const gap = 16;
  const margin = 12;
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  let left = event.clientX + gap;
  let top = event.clientY + gap;
  if (left + width > window.innerWidth - margin) {
    left = event.clientX - width - gap;
  }
  if (top + height > window.innerHeight - margin) {
    top = event.clientY - height - gap;
  }
  node.style.left = `${Math.max(margin, left)}px`;
  node.style.top = `${Math.max(margin, top)}px`;
  node.setAttribute("data-show", "");
}

function frameVariants(
  tile: PresentationTile,
  reduced: boolean,
  closedRadius: number,
  openRadius: number,
  introOffset: number,
) {
  const travel = moveTransition(reduced, OPEN_SHELL_S);
  const settle = moveTransition(reduced, OPEN_SHELL_S, CLOSE_MOVE_DELAY_S);

  return {
    closed: {
      left: tile.closedX ?? tile.x,
      top: tile.closedY ?? tile.y,
      width: tile.closedWidth ?? tile.width,
      height: tile.closedHeight ?? tile.height,
      borderRadius: closedRadius,
      transition: settle,
    },
    open: {
      left: tile.x,
      top: tile.y + introOffset,
      width: tile.width,
      height: tile.height,
      borderRadius: openRadius,
      transition: travel,
    },
  };
}

function ShellTile({
  tile,
  expanded,
  appearOpen,
  tune,
  described,
  scrollable,
  shift,
  fades,
  reduced,
  introOffset,
}: {
  tile: PresentationTile;
  expanded: boolean;
  appearOpen: boolean;
  tune: CardTune;
  described: string | null;
  scrollable: boolean;
  shift: ReturnType<typeof shiftVariants>;
  fades: Map<number, ReturnType<typeof tileVariants>>;
  reduced: boolean;
  introOffset: number;
}) {
  const moving = tile.shiftX !== 0 || tile.shiftY !== 0;
  const resized = tile.closedWidth !== undefined;
  const hasFace = tileHasFace(tile);
  const masked = tune.masked;
  // Live board (unmasked): never paint empty black placeholders. Lab masked
  // studies keep silhouette tiles on purpose.
  if (!hasFace && !masked) {
    return null;
  }
  const copy = tileHasCopy(tile);
  const shaped = !hasFace || masked;
  const tuned = tunedContentRadius(tile.radius, tune);
  const closedRadius = tileContentRadius(tile, tuned, masked);
  const openTuned =
    tile.openRadius !== undefined ? tunedContentRadius(tile.openRadius, tune) : tuned;
  const openRadius =
    tile.openRadius !== undefined
      ? tileContentRadius(tile, openTuned, masked)
      : tileOpenRadius(tile, tuned, masked);
  const openTop = tile.y + (expanded ? introOffset : 0);
  const style = {
    left: resized ? undefined : tile.x,
    top: resized ? undefined : openTop,
    width: resized ? undefined : tile.width,
    height: resized ? undefined : tile.height,
    // Resized tiles animate radius via variants; others keep the resting value.
    borderRadius: resized ? undefined : closedRadius,
    background: copy || (hasFace && !shaped) ? "transparent" : undefined,
  };
  const face = <TileFace tile={tile} masked={masked} appearOpen={appearOpen} scrollable={scrollable} />;
  // Media stays decorative. Copy and the live embed are readable once the card is open.
  const exposed = (copy || tileHasEmbed(tile) || tileHasImage(tile)) && (expanded || appearOpen);
  const hidden = exposed ? undefined : true;

  if (!moving && tile.resting && !resized) {
    return (
      <span
        className="card-tile"
        aria-hidden={hidden}
        data-resting=""
        data-tile={tile.id}
        data-image={tileHasImage(tile) ? "" : undefined}
        data-copy={copy ? "" : undefined}
        data-icon={tile.icon ? "" : undefined}
        data-embed={tileHasEmbed(tile) ? "" : undefined}
        data-described={described === tile.id ? "" : undefined}
        style={style}
      >
        <span className="card-reveal">{face}</span>
      </span>
    );
  }

  return (
    <motion.span
      className="card-tile"
      aria-hidden={hidden}
      data-resting={tile.resting ? "" : undefined}
      data-tile={tile.id}
      data-image={tileHasImage(tile) ? "" : undefined}
      data-copy={copy ? "" : undefined}
      data-icon={tile.icon ? "" : undefined}
      data-embed={tileHasEmbed(tile) ? "" : undefined}
      data-described={described === tile.id ? "" : undefined}
      initial="closed"
      animate={expanded ? "open" : "closed"}
      variants={
        resized
          ? frameVariants(tile, reduced, closedRadius, openRadius, expanded ? introOffset : 0)
          : moving
            ? shift
            : fades.get(Math.min(MAX_FADE_RING, Math.max(1, tile.ring)))
      }
      style={style}
    >
      <span className="card-reveal">{face}</span>
    </motion.span>
  );
}
