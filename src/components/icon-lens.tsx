"use client";

import { useLayoutEffect, useRef } from "react";
import { AppIcon, APP_ICON_MARKS } from "@/components/app-icon";
import {
  applyRubber,
  clamp,
  easeInOut,
  easeOut,
  invertRadius,
  lensSigma,
  nearestIndex,
  placeItem,
} from "@/lib/collection-lens-math";
import { collectionIsPixelated, openCollection, type CollectionId } from "@/lib/collections";

const COLS = 29;
const ROWS = 21;
const COUNT = COLS * ROWS;
const CELL = 256;
const PITCH = CELL + 16;
const FOCUS_INDEX = Math.floor((COLS - 1) / 2) + Math.floor((ROWS - 1) / 2) * COLS;
const OPEN_W = 1532;
const OPEN_H = 862;
const DRAG_SLOP = 8;
const GLIDE_MS = 280;
const RUBBER_MS = 260;
const ENTER_MS = 360;
const EXIT_MS = 160;

const BOUNDS = {
  minX: 0,
  maxX: (COLS - 1) * PITCH,
  minY: 0,
  maxY: (ROWS - 1) * PITCH,
};

type Motion =
  | { kind: "idle" }
  | { kind: "momentum"; vx: number; vy: number }
  | {
      kind: "glide";
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      start: number;
      duration: number;
      ease: (amount: number) => number;
    };

type Placed = { index: number; x: number; y: number; scale: number; opacity: number };

type IconLensProps = {
  expanded: boolean;
  reduced: boolean;
  blank?: boolean;
  collectionId?: CollectionId;
  poster?: string;
  onClose: () => void;
  onGesture: () => void;
};

export function IconLens({
  expanded,
  reduced,
  blank = false,
  collectionId,
  poster,
  onClose,
  onGesture,
}: IconLensProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const expandedRef = useRef(expanded);
  const reducedRef = useRef(reduced);
  const onCloseRef = useRef(onClose);
  const onGestureRef = useRef(onGesture);
  const kickRef = useRef<() => void>(() => {});
  expandedRef.current = expanded;
  reducedRef.current = reduced;
  onCloseRef.current = onClose;
  onGestureRef.current = onGesture;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const shell = root?.parentElement;
    if (!root || !shell) {
      return;
    }

    const camera = {
      x: Math.floor((COLS - 1) / 2) * PITCH,
      y: Math.floor((ROWS - 1) / 2) * PITCH,
    };
    let motion: Motion = { kind: "idle" };
    let reveal = expandedRef.current ? 1 : 0;
    let revealFrom = reveal;
    let revealTo = reveal;
    let revealStart = 0;
    let edgeSoft = false;
    let raf = 0;
    let lastFrame = 0;
    const placed: Placed[] = [];

    const shellOpen = () => shell.offsetWidth >= OPEN_W - 2 && shell.offsetHeight >= OPEN_H - 2;

    const viewCamera = () => {
      if (!edgeSoft) {
        return { x: camera.x, y: camera.y };
      }
      return {
        x: applyRubber(camera.x, BOUNDS.minX, BOUNDS.maxX),
        y: applyRubber(camera.y, BOUNDS.minY, BOUNDS.maxY),
      };
    };

    const focusOf = (x: number, y: number) => nearestIndex(x, y, COLS, ROWS, COUNT, PITCH);

    const draw = () => {
      const width = shell.offsetWidth;
      const height = shell.offsetHeight;
      const view = viewCamera();
      const focus = focusOf(view.x, view.y);
      const live = shellOpen() && (expandedRef.current || reveal > 0.001);
      const sigma = lensSigma(Math.min(width, height), CELL);
      const screenRadius = Math.hypot(width, height) / 2 + CELL;
      const worldRadius = invertRadius(screenRadius, sigma, reducedRef.current) + PITCH;
      placed.length = 0;

      for (let index = 0; index < COUNT; index += 1) {
        const cell = cellsRef.current[index];
        if (!cell) {
          continue;
        }

        if (!live) {
          const visible = index === focus;
          cell.style.transform = visible
            ? `translate3d(${(width - CELL) / 2}px, ${(height - CELL) / 2}px, 0) scale(1)`
            : "translate3d(-9999px, 0, 0) scale(1)";
          cell.style.opacity = visible ? "1" : "0";
          cell.style.zIndex = visible ? "2" : "0";
          continue;
        }

        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const dx = col * PITCH - view.x;
        const dy = row * PITCH - view.y;
        if (Math.hypot(dx, dy) > worldRadius) {
          cell.style.opacity = "0";
          continue;
        }
        const spot = placeItem(dx, dy, sigma, reducedRef.current);
        const opacity = index === focus ? 1 : spot.opacity * reveal;
        const x = width / 2 + spot.x;
        const y = height / 2 + spot.y;
        cell.style.transform = `translate3d(${x - CELL / 2}px, ${y - CELL / 2}px, 0) scale(${spot.scale})`;
        cell.style.opacity = String(opacity);
        cell.style.zIndex = String(Math.round(spot.scale * 100));
        if (opacity > 0.2) {
          placed.push({ index, x, y, scale: spot.scale, opacity });
        }
      }
    };

    const stepMotion = (now: number, dt: number) => {
      if (reducedRef.current) {
        motion = { kind: "idle" };
        camera.x = clamp(camera.x, BOUNDS.minX, BOUNDS.maxX);
        camera.y = clamp(camera.y, BOUNDS.minY, BOUNDS.maxY);
        return false;
      }

      switch (motion.kind) {
        case "idle":
          return false;
        case "momentum": {
          camera.x += motion.vx * dt;
          camera.y += motion.vy * dt;
          const decay = Math.exp((-6 * dt) / 1000);
          motion.vx *= decay;
          motion.vy *= decay;
          if (camera.x < BOUNDS.minX) {
            camera.x = BOUNDS.minX;
            motion.vx = 0;
          } else if (camera.x > BOUNDS.maxX) {
            camera.x = BOUNDS.maxX;
            motion.vx = 0;
          }
          if (camera.y < BOUNDS.minY) {
            camera.y = BOUNDS.minY;
            motion.vy = 0;
          } else if (camera.y > BOUNDS.maxY) {
            camera.y = BOUNDS.maxY;
            motion.vy = 0;
          }
          if (Math.hypot(motion.vx, motion.vy) < 0.02) {
            motion = { kind: "idle" };
            return false;
          }
          return true;
        }
        case "glide": {
          const amount = Math.min(1, (now - motion.start) / motion.duration);
          const eased = motion.ease(amount);
          camera.x = motion.fromX + (motion.toX - motion.fromX) * eased;
          camera.y = motion.fromY + (motion.toY - motion.fromY) * eased;
          if (amount >= 1) {
            motion = { kind: "idle" };
            return false;
          }
          return true;
        }
        default: {
          const unknown: never = motion;
          return unknown;
        }
      }
    };

    const startGlide = (toX: number, toY: number, duration: number, ease: (amount: number) => number) => {
      if (duration <= 0) {
        camera.x = toX;
        camera.y = toY;
        motion = { kind: "idle" };
        draw();
        return;
      }
      motion = {
        kind: "glide",
        fromX: camera.x,
        fromY: camera.y,
        toX,
        toY,
        start: performance.now(),
        duration,
        ease,
      };
      kick();
    };

    const settle = (vx: number, vy: number) => {
      if (edgeSoft) {
        camera.x = applyRubber(camera.x, BOUNDS.minX, BOUNDS.maxX);
        camera.y = applyRubber(camera.y, BOUNDS.minY, BOUNDS.maxY);
        edgeSoft = false;
      }
      const toX = clamp(camera.x, BOUNDS.minX, BOUNDS.maxX);
      const toY = clamp(camera.y, BOUNDS.minY, BOUNDS.maxY);
      const outside = Math.abs(toX - camera.x) > 0.5 || Math.abs(toY - camera.y) > 0.5;
      if (outside) {
        startGlide(toX, toY, reducedRef.current ? 0 : RUBBER_MS, easeOut);
        return;
      }
      if (reducedRef.current || Math.hypot(vx, vy) < 0.15) {
        motion = { kind: "idle" };
        draw();
        return;
      }
      motion = { kind: "momentum", vx, vy };
      kick();
    };

    const frame = (now: number) => {
      const dt = Math.min(34, now - lastFrame);
      lastFrame = now;
      const want = expandedRef.current && shellOpen() ? 1 : 0;
      if (want !== revealTo) {
        if (want === 0) {
          const view = viewCamera();
          camera.x = view.x;
          camera.y = view.y;
          edgeSoft = false;
          const index = focusOf(camera.x, camera.y);
          startGlide(
            (index % COLS) * PITCH,
            Math.floor(index / COLS) * PITCH,
            reducedRef.current ? 0 : EXIT_MS,
            easeOut,
          );
        }
        revealFrom = reveal;
        revealTo = want;
        revealStart = now;
      }
      if (reveal !== revealTo) {
        if (reducedRef.current) {
          reveal = revealTo;
        } else {
          const duration = revealTo > revealFrom ? ENTER_MS : EXIT_MS;
          const amount = Math.min(1, (now - revealStart) / duration);
          reveal = revealFrom + (revealTo - revealFrom) * easeOut(amount);
          if (amount >= 1) {
            reveal = revealTo;
          }
        }
      }
      const moving = stepMotion(now, dt);
      draw();
      raf = moving || reveal !== revealTo ? window.requestAnimationFrame(frame) : 0;
    };

    const kick = () => {
      if (raf) {
        return;
      }
      lastFrame = performance.now();
      raf = window.requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const layoutScale = () => {
      const rect = root.getBoundingClientRect();
      return rect.width / Math.max(root.offsetWidth, 1);
    };

    const localPoint = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const scale = rect.width / Math.max(root.offsetWidth, 1);
      return {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      };
    };

    const hitTest = (x: number, y: number) => {
      let best: number | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const item of placed) {
        const half = (CELL * item.scale) / 2 + DRAG_SLOP;
        if (Math.abs(x - item.x) > half || Math.abs(y - item.y) > half) {
          continue;
        }
        const distance = (x - item.x) ** 2 + (y - item.y) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = item.index;
        }
      }
      return best;
    };

    let active: number | null = null;
    let dragging = false;
    let originX = 0;
    let originY = 0;
    let lastX = 0;
    let lastY = 0;
    const samples: { x: number; y: number; t: number }[] = [];

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || active != null || !expandedRef.current) {
        return;
      }
      event.preventDefault();
      onGestureRef.current();
      active = event.pointerId;
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        // The pointer can end before capture.
      }
      motion = { kind: "idle" };
      dragging = false;
      edgeSoft = true;
      originX = event.clientX;
      originY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      samples.length = 0;
      samples.push({ x: event.clientX, y: event.clientY, t: performance.now() });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== active) {
        return;
      }
      if (!dragging && Math.hypot(event.clientX - originX, event.clientY - originY) < DRAG_SLOP) {
        return;
      }
      dragging = true;
      root.dataset.dragging = "true";
      const scale = layoutScale();
      const dx = (event.clientX - lastX) / scale;
      const dy = (event.clientY - lastY) / scale;
      lastX = event.clientX;
      lastY = event.clientY;
      const now = performance.now();
      samples.push({ x: event.clientX, y: event.clientY, t: now });
      while (samples.length > 0 && samples[0] && now - samples[0].t > 90) {
        samples.shift();
      }
      if (reducedRef.current) {
        camera.x = clamp(camera.x - dx, BOUNDS.minX, BOUNDS.maxX);
        camera.y = clamp(camera.y - dy, BOUNDS.minY, BOUNDS.maxY);
        edgeSoft = false;
      } else {
        camera.x -= dx;
        camera.y -= dy;
      }
      draw();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== active) {
        return;
      }
      active = null;
      delete root.dataset.dragging;
      const wasDrag = dragging;
      dragging = false;
      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }
      if (!expandedRef.current || !shellOpen()) {
        edgeSoft = false;
        return;
      }
      if (!wasDrag) {
        edgeSoft = false;
        const point = localPoint(event);
        const hit = hitTest(point.x, point.y);
        const view = viewCamera();
        const focus = focusOf(view.x, view.y);
        if (hit == null || hit === focus) {
          onCloseRef.current();
          return;
        }
        startGlide((hit % COLS) * PITCH, Math.floor(hit / COLS) * PITCH, reducedRef.current ? 0 : GLIDE_MS, easeInOut);
        return;
      }
      let vx = 0;
      let vy = 0;
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (first && last && last.t > first.t) {
        const scale = layoutScale();
        const dt = last.t - first.t;
        vx = (first.x - last.x) / scale / dt;
        vy = (first.y - last.y) / scale / dt;
      }
      settle(vx, vy);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!expandedRef.current || !shellOpen() || event.repeat) {
        return;
      }
      let dCol = 0;
      let dRow = 0;
      if (event.key === "ArrowLeft") {
        dCol = -1;
      } else if (event.key === "ArrowRight") {
        dCol = 1;
      } else if (event.key === "ArrowUp") {
        dRow = -1;
      } else if (event.key === "ArrowDown") {
        dRow = 1;
      } else {
        return;
      }
      event.preventDefault();
      const view = viewCamera();
      const index = focusOf(view.x, view.y);
      const col = clamp((index % COLS) + dCol, 0, COLS - 1);
      const row = clamp(Math.floor(index / COLS) + dRow, 0, ROWS - 1);
      motion = { kind: "idle" };
      edgeSoft = false;
      camera.x = col * PITCH;
      camera.y = row * PITCH;
      draw();
    };

    const observer = new ResizeObserver(() => kick());
    observer.observe(shell);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKey);
    draw();

    return () => {
      kickRef.current = () => {};
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      observer.disconnect();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useLayoutEffect(() => {
    if (expanded) {
      rootRef.current?.setAttribute("data-open", "");
    } else {
      rootRef.current?.removeAttribute("data-open");
    }
    kickRef.current();
  }, [expanded, reduced]);

  useLayoutEffect(() => {
    if (!collectionId) {
      return;
    }

    const opened = openCollection(collectionId);
    let unsubscribe = () => {};
    let cancelled = false;

    void opened.catalog.then((catalog) => {
      if (cancelled) {
        return;
      }
      const paint = () => {
        const count = Math.max(catalog.count, 1);
        for (let index = 0; index < COUNT; index += 1) {
          const itemIndex = index % count;
          // Chunked catalogs (Chia Friends) only load the hero chunk until asked.
          catalog.ensure(itemIndex);
          const image = cellsRef.current[index]?.querySelector("img");
          const piece = catalog.piece(itemIndex);
          if (!(image instanceof HTMLImageElement) || !piece || image.getAttribute("src") === piece.src) {
            continue;
          }
          image.src = piece.src;
        }
      };
      paint();
      unsubscribe = catalog.subscribe(paint);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      opened.release();
    };
  }, [collectionId]);

  return (
    <div
      ref={rootRef}
      className="icon-lens"
      data-pixelated={collectionId && collectionIsPixelated(collectionId) ? "" : undefined}
    >
      {Array.from({ length: COUNT }, (_, index) => {
        const primary = index === FOCUS_INDEX;
        const mark = primary ? "vault" : APP_ICON_MARKS[index % APP_ICON_MARKS.length];

        return (
          <span
            key={index}
            ref={(node) => {
              cellsRef.current[index] = node;
            }}
            className="icon-lens-cell"
            aria-hidden="true"
            style={{ width: CELL, height: CELL }}
          >
            {collectionId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="icon-lens-piece" src={poster || undefined} alt="" draggable={false} />
            ) : (
              <AppIcon mark={mark} rounded blank={blank} />
            )}
          </span>
        );
      })}
    </div>
  );
}
