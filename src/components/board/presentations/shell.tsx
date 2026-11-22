"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";

import { IconDock, iconDockClosed } from "@/components/icon-dock";
import { IconLens } from "@/components/icon-lens";
import { CardOpenHeader, CARD_OPEN_HEADER } from "@/components/card-open-header";
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
import { TileFace, tileHasImage } from "@/components/board/presentations/tile-face";
import type { PresentationFrame, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";
import { tunedContentRadius, type CardTune } from "@/components/card-tune-panel";

const ICON_DOCK_FRAME = placed(iconDockClosed);

export function contentHeight(tiles: PresentationTile[]) {
  return tiles.reduce((max, tile) => Math.max(max, tile.y + tile.height), 0) + 64;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  const ignoreClick = useRef(0);
  const masked = tune.masked;
  const cardName = study.tiles.find((tile) => tile.resting)?.label ?? study.label;
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
  if ((!expanded || lensOn || dockOn) && armed) {
    setArmed(false);
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

  return (
    <motion.div
      ref={shellRef}
      key={shellKey}
      className="card-shell"
      style={shellStyle}
      whileHover={
        appearOpen || reduced
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
          if (id) {
            setDescribed((current) => (current === id ? null : id));
          }
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
          onGesture={() => {
            ignoreClick.current = performance.now();
          }}
          onClose={() => {
            ignoreClick.current = performance.now();
            onClose();
          }}
        />
      ) : null}
      {dockOn ? <IconDock expanded={expanded} reduced={reduced} blank={masked && !appearOpen} /> : null}
      {lensOn || dockOn ? null : (
        <div
          ref={scrollRef}
          className="card-scroll"
          onScroll={() => {
            lastScroll.current = performance.now();
          }}
        >
          <motion.div
            className="card-scroll-body"
            initial={false}
            animate={{ y: expanded ? CARD_OPEN_HEADER : 0 }}
            transition={moveTransition(reduced, OPEN_SHELL_S, expanded ? 0 : CLOSE_MOVE_DELAY_S)}
            style={{ height: contentHeight(study.tiles) + CARD_OPEN_HEADER }}
          >
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
    </motion.div>
  );
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
}: {
  tile: PresentationTile;
  expanded: boolean;
  appearOpen: boolean;
  tune: CardTune;
  described: string | null;
  scrollable: boolean;
  shift: ReturnType<typeof shiftVariants>;
  fades: Map<number, ReturnType<typeof tileVariants>>;
}) {
  const moving = tile.shiftX !== 0 || tile.shiftY !== 0;
  const hasFace = tileHasImage(tile) || Boolean(tile.icon);
  const masked = tune.masked;
  const shaped = !hasFace || masked;
  const style = {
    left: tile.x,
    top: tile.y,
    width: tile.width,
    height: tile.height,
    borderRadius: tile.icon ? 0 : shaped ? tunedContentRadius(tile.radius, tune) : 0,
    background: hasFace && !shaped ? "transparent" : undefined,
  };
  const face = <TileFace tile={tile} masked={masked} appearOpen={appearOpen} scrollable={scrollable} />;

  if (!moving && tile.resting) {
    return (
      <span
        className="card-tile"
        aria-hidden="true"
        data-resting=""
        data-tile={tile.id}
        data-image={tileHasImage(tile) ? "" : undefined}
        data-icon={tile.icon ? "" : undefined}
        data-described={described === tile.id ? "" : undefined}
        style={style}
      >
        {face}
      </span>
    );
  }

  return (
    <motion.span
      className="card-tile"
      aria-hidden="true"
      data-resting={tile.resting ? "" : undefined}
      data-tile={tile.id}
      data-image={tileHasImage(tile) ? "" : undefined}
      data-icon={tile.icon ? "" : undefined}
      data-described={described === tile.id ? "" : undefined}
      initial="closed"
      animate={expanded ? "open" : "closed"}
      variants={moving ? shift : fades.get(Math.min(MAX_FADE_RING, Math.max(1, tile.ring)))}
      style={style}
    >
      {face}
    </motion.span>
  );
}
