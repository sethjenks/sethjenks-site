"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppIcon, APP_ICON_MARKS, type AppIconMark } from "@/components/app-icon";

const ICON = 104;
const GAP = 22;
const PAD_X = 26;
const PAD_Y = 22;
const BAR_H = PAD_Y * 2 + ICON;

// Closed crop: left edge in frame, right cut off; expand reveals the full dock.
const CLOSED_INSET_X = 64;
const CLOSED_INSET_Y = 100;
const OPEN_W = 1532;
const OPEN_H = 862;
const OPEN_S = 0.42;
const CLOSE_S = 0.32;
const CLOSE_DELAY = 0.16;
const EASE = [0.22, 1, 0.36, 1] as const;

export const iconDockClosed = { width: 700, height: 480 };

function dockBarWidth(count: number) {
  const n = Math.max(1, count);
  return PAD_X * 2 + n * ICON + (n - 1) * GAP;
}

/** Scale for generous top/bottom pad; bump if needed so the dock runs off the right. */
function closedScale(barW: number) {
  const fromHeight = (iconDockClosed.height - CLOSED_INSET_Y * 2) / BAR_H;
  if (barW * fromHeight + CLOSED_INSET_X > iconDockClosed.width) {
    return fromHeight;
  }
  // Hang ~18% past the right edge so the resting crop reads as cut off.
  return (iconDockClosed.width - CLOSED_INSET_X) / (barW * 0.82);
}

type IconDockProps = {
  expanded: boolean;
  reduced: boolean;
  blank?: boolean;
  /** Icons assigned to this project — shown once each, no repeats. */
  marks?: readonly AppIconMark[];
  /**
   * Board resting cards are not the design closed size. Scale the closed pose
   * to the live container so top/bottom insets actually show.
   */
  fitToContainer?: boolean;
};

export function IconDock({
  expanded,
  reduced,
  blank = false,
  marks = APP_ICON_MARKS,
  fitToContainer = false,
}: IconDockProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(iconDockClosed.width);
  const icons = marks.length > 0 ? marks : APP_ICON_MARKS;
  const barW = dockBarWidth(icons.length);
  const motionReduced = useReducedMotion() === true;
  const calm = reduced || motionReduced;

  useLayoutEffect(() => {
    if (!fitToContainer) {
      return;
    }
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const update = () => {
      setContainerW(el.getBoundingClientRect().width);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToContainer]);

  const variants = useMemo(() => {
    const scale = closedScale(barW);
    const closedY = (iconDockClosed.height - BAR_H * scale) / 2;
    const fit = fitToContainer ? containerW / iconDockClosed.width : 1;
    const openX = (OPEN_W - barW) / 2;
    const openY = (OPEN_H - BAR_H) / 2;

    return {
      closed: {
        x: CLOSED_INSET_X * fit,
        y: closedY * fit,
        scale: scale * fit,
        transition: calm
          ? { duration: 0, delay: 0 }
          : { duration: CLOSE_S, ease: EASE, delay: CLOSE_DELAY },
      },
      open: {
        x: openX,
        y: openY,
        scale: 1,
        transition: calm ? { duration: 0, delay: 0 } : { duration: OPEN_S, ease: EASE, delay: 0 },
      },
    };
  }, [barW, calm, containerW, fitToContainer]);

  return (
    <div ref={rootRef} className="icon-dock" aria-hidden="true">
      <motion.div
        className="icon-dock-bar"
        initial="closed"
        animate={expanded ? "open" : "closed"}
        variants={variants}
        style={{
          width: barW,
          height: BAR_H,
          transformOrigin: "0 0",
        }}
      >
        {/* Glass stays empty — backdrop-filter + child shadows creates a square halo. */}
        <div className="icon-dock-glass" aria-hidden="true" />
        <div className="icon-dock-row" style={{ gap: GAP, padding: `${PAD_Y}px ${PAD_X}px` }}>
          {icons.map((mark) => (
            <span key={mark} className="icon-dock-icon" style={{ width: ICON, height: ICON }}>
              <AppIcon mark={mark} rounded blank={blank} />
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
