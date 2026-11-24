"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { ExpandLoop } from "@/components/board/expand-loop";
import { createMasonryFlex } from "@/components/board/masonry-flex";
import { PresentationResting } from "@/components/board/presentations/resting";
import { iconPresentation } from "@/components/board/presentations/icon";
import { STUDIES, WIDGET_STUDIES } from "@/components/board/presentations/registry";
import { PresentationShell } from "@/components/board/presentations/shell";
import { STAGE_H, STAGE_W } from "@/components/board/presentations/stage";
import type { PresentationBox, PresentationKind, PresentationSpec } from "@/components/board/presentations/types";
import type { WidgetOrientation } from "@/components/board/presentations/widget";
import { TileChrome } from "@/components/board/tile-chrome";
import { CardTunePanel, DEFAULT_CARD_TUNE, type CardTune } from "@/components/card-tune-panel";

type IconLayout = "grid" | "lens" | "dock";

const MASONRY_COLUMNS: PresentationKind[][] = [
  ["phone", "widget"],
  ["desktop", "icon"],
];

/** Icon → Lens: fisheye over a real collection (replaces the old Collection type). */
const ICON_LENS_STUDY = iconPresentation(
  { title: "Trashformers", chips: ["Collection"] },
  {
    id: "trashformers",
    poster: "/media/work/trashformers-poster.jpg",
    title: "Trashformers",
  },
);

function useStageScale() {
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const fit = () => {
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return scale;
}

function useMasonryFlex() {
  const [flex] = useState(() =>
    createMasonryFlex({
      tileSelector: ".card-masonry-tile",
      columnSelector: ".card-masonry-column",
    }),
  );

  useEffect(() => {
    return () => flex.dispose();
  }, [flex]);

  return flex;
}

function CardMasonry({
  openId,
  tune,
  onOpen,
}: {
  openId: PresentationKind | null;
  tune: CardTune;
  onOpen: (id: PresentationKind, origin: PresentationBox) => void;
}) {
  const masonryRef = useRef<HTMLDivElement>(null);
  const flex = useMasonryFlex();

  useEffect(() => {
    if (!openId) {
      return;
    }
    flex.release(masonryRef.current, false);
  }, [flex, openId]);

  return (
    <div
      className="card-masonry"
      data-cols={MASONRY_COLUMNS.length}
      ref={masonryRef}
      onPointerOver={openId ? undefined : flex.grow}
      onPointerLeave={() => flex.release(masonryRef.current, true)}
      onFocus={openId ? undefined : flex.grow}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        flex.release(masonryRef.current, true);
      }}
    >
      {MASONRY_COLUMNS.map((column) => (
        <div className="card-masonry-column" key={column.join("-")}>
          {column.map((id) => {
            const item = STUDIES[id];
            return (
              <ClosedStudy
                key={item.id}
                study={item}
                held={openId === item.id}
                tune={tune}
                onOpen={(origin) => onOpen(item.id, origin)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ClosedStudy({
  study,
  held,
  tune,
  onOpen,
}: {
  study: PresentationSpec;
  held: boolean;
  tune: CardTune;
  onOpen: (origin: PresentationBox) => void;
}) {
  const tile = study.tiles.find((item) => item.resting);
  const shell = study.closed;
  const name = tile?.label ?? study.label;

  return (
    <button
      type="button"
      className="card-masonry-tile"
      data-study={study.id}
      data-held={held ? "" : undefined}
      aria-hidden={held || undefined}
      tabIndex={held ? -1 : undefined}
      style={{ aspectRatio: `${shell.width} / ${shell.height}` }}
      aria-label={`Open ${name}`}
      onClick={(event) => {
        if (held) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        onOpen({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      }}
    >
      <PresentationResting spec={study} tune={tune} />
      <TileChrome label={name} titleClassName="card-name" expandClassName="card-expand" />
    </button>
  );
}

export function CardExpand() {
  const [variant, setVariant] = useState<PresentationKind>("phone");
  const [layout, setLayout] = useState<"single" | "masonry">("single");
  const [expanded, setExpanded] = useState(false);
  const [described, setDescribed] = useState<string | null>(null);
  const [iconLayout, setIconLayout] = useState<IconLayout>("grid");
  const [orientation, setOrientation] = useState<WidgetOrientation>("landscape");
  const [tune, setTune] = useState<CardTune>(DEFAULT_CARD_TUNE);
  const [masonryOpen, setMasonryOpen] = useState<{ id: PresentationKind; origin: PresentationBox } | null>(null);
  const study =
    variant === "widget"
      ? WIDGET_STUDIES[orientation]
      : variant === "icon" && iconLayout === "lens"
        ? ICON_LENS_STUDY
        : STUDIES[variant];
  const lensOn = study.id === "icon" && iconLayout === "lens";
  const dockOn = study.id === "icon" && iconLayout === "dock";
  const contentDefault = study.tiles.find((tile) => tile.resting)?.radius ?? 0;
  const studyState =
    layout === "masonry"
      ? masonryOpen
        ? `Masonry · ${STUDIES[masonryOpen.id].label} · open`
        : "Masonry"
      : study.id === "icon"
        ? `${study.label} · ${iconLayout} · ${expanded ? "open" : "closed"}`
        : study.id === "widget"
          ? `${study.label} · ${orientation} · ${expanded ? "open" : "closed"}`
          : `${study.label} · ${expanded ? "open" : "closed"}`;
  const devState = `${studyState} · ${tune.masked ? "masked" : "unmasked"}`;
  const scale = useStageScale();
  const reduced = useReducedMotion() === true;
  const shellKey =
    study.id === "widget"
      ? `${study.id}-${orientation}`
      : study.id === "icon" && iconLayout === "dock"
        ? "icon-dock"
        : study.id;
  const stageStyle = {
    "--card-shell-bg": tune.shellBackground,
    "--card-shell-radius": `${tune.shellRadius}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!expanded || layout !== "single") {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }

      event.preventDefault();
      setDescribed(null);
      setExpanded(false);
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [expanded, layout]);

  return (
    <main
      className="card-stage"
      data-layout={layout}
      data-mask={tune.masked ? "" : undefined}
      data-open={masonryOpen ? "" : undefined}
      style={stageStyle}
    >
      <div className="card-switch-stack">
        <div className="card-switch" role="group" aria-label="Layout">
          <button
            type="button"
            aria-pressed={layout === "single"}
            onClick={() => {
              setMasonryOpen(null);
              setLayout("single");
            }}
          >
            Single
          </button>
          <button
            type="button"
            aria-pressed={layout === "masonry"}
            onClick={() => {
              setDescribed(null);
              setExpanded(false);
              setLayout("masonry");
            }}
          >
            Masonry
          </button>
        </div>
        {layout === "single" ? (
          <div className="card-switch-side">
            <div className="card-switch" role="group" aria-label="Card type">
              {(Object.keys(STUDIES) as PresentationKind[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id === variant}
                  onClick={() => {
                    setDescribed(null);
                    setExpanded(false);
                    setVariant(id);
                  }}
                >
                  {STUDIES[id].label}
                </button>
              ))}
            </div>
            {study.id === "widget" ? (
              <div className="card-switch" role="group" aria-label="Widget orientation">
                <button
                  type="button"
                  aria-pressed={orientation === "landscape"}
                  onClick={() => {
                    setDescribed(null);
                    setExpanded(false);
                    setOrientation("landscape");
                  }}
                >
                  Landscape
                </button>
                <button
                  type="button"
                  aria-pressed={orientation === "portrait"}
                  onClick={() => {
                    setDescribed(null);
                    setExpanded(false);
                    setOrientation("portrait");
                  }}
                >
                  Portrait
                </button>
              </div>
            ) : null}
            {study.id === "icon" ? (
              <div className="card-switch" role="group" aria-label="Icon layout">
                {(
                  [
                    ["grid", "Grid"],
                    ["lens", "Lens"],
                    ["dock", "Dock"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={iconLayout === id}
                    onClick={() => {
                      setDescribed(null);
                      setExpanded(false);
                      setIconLayout(id);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="card-dev">{devState}</p>
      {layout === "single" ? (
        <CardTunePanel tune={tune} onChange={setTune} contentDefault={contentDefault} />
      ) : null}
      {layout === "masonry" ? (
        <CardMasonry
          openId={masonryOpen?.id ?? null}
          tune={tune}
          onOpen={(id, origin) => {
            setMasonryOpen({ id, origin });
          }}
        />
      ) : (
        <div
          className="card-canvas"
          style={{
            transform: scale === null ? undefined : `translate(-50%, -50%) scale(${scale})`,
            visibility: scale === null ? "hidden" : "visible",
          }}
        >
          <PresentationShell
            shellKey={shellKey}
            study={study}
            expanded={expanded}
            reduced={reduced}
            described={described}
            setDescribed={setDescribed}
            lensOn={lensOn}
            dockOn={dockOn}
            tune={tune}
            onToggle={() => {
              setDescribed(null);
              setExpanded((open) => !open);
            }}
            onClose={() => {
              setDescribed(null);
              setExpanded(false);
            }}
          />
        </div>
      )}
      {layout === "masonry" && masonryOpen ? (
        <ExpandLoop
          spec={STUDIES[masonryOpen.id]}
          origin={masonryOpen.origin}
          tune={tune}
          heldSelector={`.card-masonry-tile[data-study="${masonryOpen.id}"]`}
          onExited={() => setMasonryOpen(null)}
        />
      ) : null}
    </main>
  );
}
