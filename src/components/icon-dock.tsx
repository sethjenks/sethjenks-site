"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { AppIcon, APP_ICON_MARKS, type AppIconMark } from "@/components/app-icon";

const ICON = 104;
const GAP = 22;
const PAD_X = 26;
const PAD_Y = 22;
const COUNT = 9;
const BAR_W = PAD_X * 2 + COUNT * ICON + (COUNT - 1) * GAP;
const BAR_H = PAD_Y * 2 + ICON;

// Closed crop of the same dock. The shell that holds it is iconDockClosed.
const CLOSED_SCALE = 1.9;
const CLOSED_X = 36;
const OPEN_W = 1532;
const OPEN_H = 862;
const OPEN_S = 0.42;
const CLOSE_S = 0.32;
const CLOSE_DELAY = 0.16;
const EASE = [0.22, 1, 0.36, 1] as const;

export const iconDockClosed = { width: 700, height: 400 };

const CLOSED_Y = (iconDockClosed.height - BAR_H * CLOSED_SCALE) / 2;
const OPEN_X = (OPEN_W - BAR_W) / 2;
const OPEN_Y = (OPEN_H - BAR_H) / 2;

const DOCK_ICONS: AppIconMark[] = Array.from({ length: COUNT }, (_, index) =>
  index === 4 ? "vault" : APP_ICON_MARKS[index % APP_ICON_MARKS.length],
);

type IconDockProps = {
  expanded: boolean;
  reduced: boolean;
  blank?: boolean;
};

export function IconDock({ expanded, reduced, blank = false }: IconDockProps) {
  const motionReduced = useReducedMotion() === true;
  const calm = reduced || motionReduced;
  const variants = useMemo(
    () => ({
      closed: {
        x: CLOSED_X,
        y: CLOSED_Y,
        scale: CLOSED_SCALE,
        transition: calm
          ? { duration: 0, delay: 0 }
          : { duration: CLOSE_S, ease: EASE, delay: CLOSE_DELAY },
      },
      open: {
        x: OPEN_X,
        y: OPEN_Y,
        scale: 1,
        transition: calm ? { duration: 0, delay: 0 } : { duration: OPEN_S, ease: EASE, delay: 0 },
      },
    }),
    [calm],
  );

  return (
    <div className="icon-dock" aria-hidden="true">
      <motion.div
        className="icon-dock-bar"
        initial="closed"
        animate={expanded ? "open" : "closed"}
        variants={variants}
        style={{
          width: BAR_W,
          height: BAR_H,
          transformOrigin: "0 0",
        }}
      >
        {/* Glass stays empty — backdrop-filter + child shadows creates a square halo. */}
        <div className="icon-dock-glass" aria-hidden="true" />
        <div className="icon-dock-row" style={{ gap: GAP, padding: `${PAD_Y}px ${PAD_X}px` }}>
          {DOCK_ICONS.map((mark, index) => (
            <span key={index} className="icon-dock-icon" style={{ width: ICON, height: ICON }}>
              <AppIcon mark={mark} rounded blank={blank} />
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
