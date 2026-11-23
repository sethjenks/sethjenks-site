"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PhoneSheet } from "@/components/board/phone-sheet";
import { mobileExperience, type MobilePattern } from "@/components/board/presentations/mobile";
import { CLOSE_MOVE_DELAY_S, CLOSE_TOTAL_S, OPEN_SHELL_S, moveTransition } from "@/components/board/presentations/motion";
import { STUDIES } from "@/components/board/presentations/registry";
import { PresentationShell } from "@/components/board/presentations/shell";
import type { PresentationBox, PresentationFrame, PresentationKind, PresentationSpec } from "@/components/board/presentations/types";
import { useMobileSheet } from "@/components/board/presentations/use-mobile-sheet";
import { DEFAULT_CARD_TUNE, type CardTune } from "@/components/card-tune-panel";

type Fit = { x: number; y: number; scale: number };

type ExpandLoopProps = {
  spec: PresentationSpec;
  origin: PresentationBox;
  tune?: CardTune;
  heldSelector: string;
  chromeSelector?: string;
  className?: string;
  onExited: () => void;
};

export function ExpandLoop(props: ExpandLoopProps) {
  const pattern = mobileOpen(props.spec.id, useMobileSheet());
  if (pattern === "pager") {
    return (
      <PhoneSheet
        spec={props.spec}
        heldSelector={props.heldSelector}
        className={props.className}
        onExited={props.onExited}
      />
    );
  }
  return <StageLoop {...props} />;
}

function mobileOpen(kind: PresentationSpec["id"], sheet: boolean): MobilePattern | "stage" {
  if (!sheet) {
    return "stage";
  }
  const pattern = mobileExperience(kind).pattern;
  switch (pattern) {
    case "pager":
      return "pager";
    default: {
      const unreachable: never = pattern;
      return unreachable;
    }
  }
}

function StageLoop({
  spec,
  origin,
  tune = DEFAULT_CARD_TUNE,
  heldSelector,
  chromeSelector = ".card-switch-stack",
  className,
  onExited,
}: ExpandLoopProps) {
  const reduced = useReducedMotion() === true;
  const [expanded, setExpanded] = useState(false);
  const [described, setDescribed] = useState<string | null>(null);
  const [closedBox, setClosedBox] = useState(origin);
  const [viewport, setViewport] = useState(() => readViewport(chromeSelector));
  const leaving = useRef(false);
  const exitTimer = useRef(0);
  const closeRef = useRef<() => void>(() => {});
  const openFrame = useMemo(
    () => masonryOpenFrame(spec.open.width, viewport),
    [spec.open.width, viewport],
  );
  const closedFit = fitToFrame(closedBox, spec.closed);
  const openScale = viewport.width / spec.open.width;
  const fit = useMemo(
    () => ({
      closed: {
        x: closedFit.x,
        y: closedFit.y,
        scale: closedFit.scale,
        transition: moveTransition(reduced, OPEN_SHELL_S, CLOSE_MOVE_DELAY_S),
      },
      open: {
        x: 0,
        y: viewport.top,
        scale: openScale,
        transition: moveTransition(reduced, OPEN_SHELL_S),
      },
    }),
    [closedFit.scale, closedFit.x, closedFit.y, openScale, reduced, viewport.top],
  );

  const requestClose = () => {
    if (leaving.current) {
      return;
    }

    leaving.current = true;
    const tile = document.querySelector<HTMLElement>(heldSelector);
    const rect = tile?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      setClosedBox({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }
    setDescribed(null);
    setExpanded(false);
    window.clearTimeout(exitTimer.current);
    const delay = reduced ? 0 : CLOSE_TOTAL_S * 1000 + 40;
    exitTimer.current = window.setTimeout(onExited, delay);
  };
  useLayoutEffect(() => {
    closeRef.current = requestClose;
  });

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setViewport(readViewport(chromeSelector));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [chromeSelector]);

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

  return (
    <div
      className={className ? `card-masonry-loop ${className}` : "card-masonry-loop"}
      data-open={expanded ? "" : undefined}
      onClick={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        requestClose();
      }}
    >
      <motion.div
        className="card-canvas card-canvas-loop"
        initial="closed"
        animate={expanded ? "open" : "closed"}
        variants={fit}
        style={{ transformOrigin: "top left" }}
      >
        <PresentationShell
          shellKey={spec.id}
          study={spec}
          expanded={expanded}
          reduced={reduced}
          described={described}
          setDescribed={setDescribed}
          lensOn={false}
          dockOn={false}
          tune={tune}
          onToggle={() => {
            if (expanded) {
              requestClose();
            }
          }}
          onClose={requestClose}
          openFrame={openFrame}
        />
      </motion.div>
    </div>
  );
}

export function labExpandLoopProps(studyId: PresentationKind) {
  return {
    spec: STUDIES[studyId],
    heldSelector: `.card-masonry-tile[data-study="${studyId}"]`,
  };
}

function fitToFrame(box: PresentationBox, frame: PresentationFrame): Fit {
  const scale = box.width / frame.width;

  return {
    x: box.left - frame.x * scale,
    y: box.top - frame.y * scale,
    scale,
  };
}

function readViewport(chromeSelector: string) {
  const nav = document.querySelector(chromeSelector)?.getBoundingClientRect();
  const bottom = nav?.bottom ?? 16;
  // A tile opened after scroll can leave the chrome above the viewport.
  // Keep the mosaic on screen instead of anchoring it off the top.
  const top = Math.ceil(Math.min(Math.max(bottom, 0), 72) + 8);

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    top,
  };
}

function masonryOpenFrame(width: number, viewport: { width: number; height: number; top: number }): PresentationFrame {
  const availHeight = Math.max(viewport.height - viewport.top, 1);
  const scale = viewport.width / width;

  return {
    x: 0,
    y: 0,
    width,
    height: availHeight / scale,
  };
}
