"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useState, type KeyboardEvent, type PointerEvent } from "react";

export type BentoPoint = { x: number; y: number };

export type BentoGesture = {
  reduced: boolean;
  hover: boolean;
  latched: boolean;
  active: boolean;
  point: BentoPoint;
  pin: BentoPoint;
  bind: {
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  };
};

type GestureMode = "moment" | "sticky";

const CENTER: BentoPoint = { x: 0.5, y: 0.5 };

function readPoint(element: HTMLElement, clientX: number, clientY: number): BentoPoint {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return CENTER;
  }

  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function useBentoGesture(mode: GestureMode = "moment"): BentoGesture {
  const reduced = useReducedMotion() === true;
  const [hover, setHover] = useState(false);
  const [hold, setHold] = useState({ latched: false, point: CENTER, pin: CENTER });

  const onPointerEnter = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") {
      return;
    }
    setHover(true);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (reduced || event.pointerType === "touch") {
        return;
      }
      setHover(true);
      const next = readPoint(event.currentTarget, event.clientX, event.clientY);
      setHold((current) => ({ ...current, point: next }));
    },
    [reduced],
  );

  const onPointerLeave = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") {
      return;
    }
    setHover(false);
    setHold((current) => ({ ...current, point: CENTER }));
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (reduced) {
        return;
      }

      const next = readPoint(event.currentTarget, event.clientX, event.clientY);
      const shouldLatch = mode === "sticky" || event.pointerType === "touch";
      setHold((current) => {
        const latched = shouldLatch ? !current.latched : current.latched;
        return {
          latched,
          point: next,
          pin: latched && !current.latched ? next : current.pin,
        };
      });
    },
    [mode, reduced],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      if (reduced) {
        return;
      }
      setHold((current) => ({ ...current, latched: !current.latched }));
    },
    [reduced],
  );

  return {
    reduced,
    hover,
    latched: hold.latched,
    active: !reduced && (hover || hold.latched),
    point: hold.point,
    pin: hold.pin,
    bind: {
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      onPointerUp,
      onKeyDown,
    },
  };
}
