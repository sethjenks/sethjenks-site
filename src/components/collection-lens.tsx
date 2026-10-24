"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  applyRubber,
  cameraBounds,
  cellSize,
  clamp,
  easeInOut,
  easeOut,
  heroIndex,
  invertRadius,
  lensSigma,
  nearestIndex,
  neighborIndex,
  pieceCaption,
  placeItem,
  worldPoint,
} from "@/lib/collection-lens-math";
import {
  collectionIsPixelated,
  openCollection,
  type CollectionCatalog,
  type CollectionId,
} from "@/lib/collections";

const GLIDE_MS = 280;
const RUBBER_MS = 260;
const MAX_CELLS = 420;
const DRAG_SLOP = 8;
const TAP_SLOP = 8;

type Bounds = ReturnType<typeof cameraBounds>;

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

type Slot = {
  el: HTMLDivElement;
  img: HTMLImageElement;
  index: number;
};

type Placed = {
  index: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

type Focus = {
  index: number;
  x: number;
  y: number;
  size: number;
  scale: number;
  src: string;
};

export type CollectionMove = (columnDelta: number, rowDelta: number) => void;

type CollectionLensProps = {
  id: CollectionId;
  poster: string;
  fallbackTitle: string;
  reducedMotion: boolean;
  revealed: boolean;
  closing: boolean;
  onFrame: (node: HTMLSpanElement | null) => void;
  moveRef: { current: CollectionMove };
  onLabel: (name: string, caption: string) => void;
};

function CollectionLensView({
  id,
  poster,
  fallbackTitle,
  reducedMotion,
  revealed,
  closing,
  onFrame,
  moveRef,
  onLabel,
}: CollectionLensProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLImageElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const manifestRef = useRef<CollectionCatalog | null>(null);
  const labelName = useRef("");
  const reducedRef = useRef(reducedMotion);
  const revealedRef = useRef(revealed);
  const closingRef = useRef(closing);
  const onLabelRef = useRef(onLabel);
  const fallbackRef = useRef(fallbackTitle);
  const onFrameRef = useRef(onFrame);
  const intent = useRef({ x: 0, y: 0 });
  const viewport = useRef({ width: 1, height: 1, cell: 148 });
  const motionRef = useRef<Motion>({ kind: "idle" });
  const edgeSoft = useRef(false);
  const centeredRef = useRef(false);
  const focusRef = useRef<Focus | null>(null);
  const labelIndex = useRef(-1);
  const heroReady = useRef(false);
  const settledRef = useRef(false);
  const settleTimer = useRef(0);
  const closePlaced = useRef(false);
  const hintHidden = useRef(false);
  const pressedRef = useRef<number | null>(null);
  const slots = useRef(new Map<number, Slot>());
  const pool = useRef<Slot[]>([]);
  const placedRef = useRef<Placed[]>([]);
  const rafRef = useRef(0);
  const wheelTimer = useRef(0);
  const activePointer = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const prepareRef = useRef<() => void>(() => {});
  const moveImpl = useRef<CollectionMove>(() => {});
  const pointerDownRef = useRef<(event: PointerEvent) => void>(() => {});
  const pointerMoveRef = useRef<(event: PointerEvent) => void>(() => {});
  const pointerUpRef = useRef<(event: PointerEvent) => void>(() => {});

  const setStageNode = useCallback((node: HTMLSpanElement | null) => {
    stageRef.current = node;
    onFrameRef.current(node);
  }, []);

  useLayoutEffect(() => {
    reducedRef.current = reducedMotion;
    revealedRef.current = revealed;
    closingRef.current = closing;
    onLabelRef.current = onLabel;
    fallbackRef.current = fallbackTitle;
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const opened = openCollection(id);
    opened.catalog.then(
      (manifest) => {
        if (!active) {
          return;
        }
        manifestRef.current = manifest;
        unsubscribe = manifest.subscribe(() => {
          drawRef.current();
        });
        prepareRef.current();
        drawRef.current();
        void manifest.heroReady.then(() => {
          if (!active) {
            return;
          }
          rootRef.current?.setAttribute("data-loaded", "true");
          prepareRef.current();
          drawRef.current();
        });
      },
      () => {
        if (active) {
          onLabelRef.current(fallbackRef.current, "Images did not load.");
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
      opened.release();
    };
  }, [id]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const boundsFor = (count: number) => cameraBounds(count, viewport.current.cell);

    const viewCamera = (bounds: Bounds) => {
      if (!edgeSoft.current) {
        return { x: intent.current.x, y: intent.current.y };
      }
      return {
        x: applyRubber(intent.current.x, bounds.minX, bounds.maxX),
        y: applyRubber(intent.current.y, bounds.minY, bounds.maxY),
      };
    };

    const publishLabel = (index: number, manifest: CollectionCatalog) => {
      const piece = manifest.piece(index);
      const name = piece?.name ?? fallbackRef.current;
      if (labelIndex.current === index && labelName.current === name) {
        return;
      }
      labelIndex.current = index;
      labelName.current = name;
      onLabelRef.current(name, pieceCaption(index, manifest.count));
    };

    const takeSlot = (): Slot => {
      const spare = pool.current.pop();
      if (spare) {
        return spare;
      }
      const el = document.createElement("div");
      el.className = "collection-cell";
      el.setAttribute("aria-hidden", "true");
      const img = document.createElement("img");
      img.alt = "";
      img.draggable = false;
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      el.append(img);
      return { el, img, index: -1 };
    };

    const draw = () => {
      const field = fieldRef.current;
      const manifest = manifestRef.current;
      if (!field || !manifest) {
        return;
      }
      const count = manifest.count;
      const { width, height, cell } = viewport.current;
      const bounds = boundsFor(count);
      const camera = viewCamera(bounds);
      const reduced = reducedRef.current;
      const sigma = lensSigma(Math.min(width, height), cell);
      const screenRadius = Math.hypot(width, height) / 2 + cell;
      const worldRadius = invertRadius(screenRadius, sigma, reduced) + bounds.pitch;
      const col0 = Math.max(0, Math.floor((camera.x - worldRadius) / bounds.pitch));
      const col1 = Math.min(
        bounds.cols - 1,
        Math.ceil((camera.x + worldRadius) / bounds.pitch),
      );
      const row0 = Math.max(0, Math.floor((camera.y - worldRadius) / bounds.pitch));
      const row1 = Math.min(
        bounds.rows - 1,
        Math.ceil((camera.y + worldRadius) / bounds.pitch),
      );
      const focus = nearestIndex(
        camera.x,
        camera.y,
        bounds.cols,
        bounds.rows,
        count,
        bounds.pitch,
      );
      const placed: Placed[] = [];

      for (let row = row0; row <= row1; row += 1) {
        for (let col = col0; col <= col1; col += 1) {
          const index = row * bounds.cols + col;
          if (index >= count) {
            continue;
          }
          const dx = col * bounds.pitch - camera.x;
          const dy = row * bounds.pitch - camera.y;
          if (Math.hypot(dx, dy) > worldRadius) {
            continue;
          }
          const spot = placeItem(dx, dy, sigma, reduced);
          placed.push({
            index,
            x: width / 2 + spot.x,
            y: height / 2 + spot.y,
            scale: spot.scale,
            opacity: spot.opacity,
          });
        }
      }

      if (placed.length > MAX_CELLS) {
        placed.sort((a, b) => {
          const aDist = (a.x - width / 2) ** 2 + (a.y - height / 2) ** 2;
          const bDist = (b.x - width / 2) ** 2 + (b.y - height / 2) ** 2;
          return aDist - bDist;
        });
        placed.length = MAX_CELLS;
      }

      placedRef.current = placed;
      const seen = new Set<number>();
      const pressed = pressedRef.current;

      for (const item of placed) {
        manifest.ensure(item.index);
        seen.add(item.index);
        let slot = slots.current.get(item.index);
        if (!slot) {
          slot = takeSlot();
          slot.index = item.index;
          slots.current.set(item.index, slot);
        }
        const piece = manifest.piece(item.index);
        if (piece && slot.img.dataset.src !== piece.src) {
          slot.img.dataset.src = piece.src;
          slot.img.src = piece.src;
          slot.img.fetchPriority = item.index === focus ? "high" : "low";
        }
        if (!slot.el.isConnected) {
          field.append(slot.el);
        }
        const press = pressed === item.index ? 0.97 : 1;
        const hidden = closingRef.current && item.index === focus;
        slot.el.style.transform = `translate3d(${item.x - cell / 2}px, ${item.y - cell / 2}px, 0) scale(${item.scale * press})`;
        slot.el.style.opacity = hidden ? "0" : String(item.opacity);
        const rank = String(Math.round(item.scale * 100));
        if (slot.el.dataset.z !== rank) {
          slot.el.dataset.z = rank;
          slot.el.style.zIndex = rank;
        }
        if ((slot.el.dataset.active === "true") !== (item.index === focus)) {
          if (item.index === focus) {
            slot.el.dataset.active = "true";
          } else {
            delete slot.el.dataset.active;
          }
        }
      }

      for (const [index, slot] of slots.current) {
        if (seen.has(index)) {
          continue;
        }
        slot.el.remove();
        slots.current.delete(index);
        pool.current.push(slot);
      }

      const piece = manifest.piece(focus);
      const focusSpot = placed.find((item) => item.index === focus);
      const focusScale = focusSpot?.scale ?? 1;
      focusRef.current = {
        index: focus,
        x: focusSpot?.x ?? width / 2,
        y: focusSpot?.y ?? height / 2,
        size: cell * focusScale,
        scale: focusScale,
        src: piece?.src ?? "",
      };
      publishLabel(focus, manifest);
    };

    drawRef.current = draw;

    const prepare = () => {
      const manifest = manifestRef.current;
      if (!manifest) {
        return;
      }
      if (!centeredRef.current) {
        const index = heroIndex(manifest.count);
        const bounds = boundsFor(manifest.count);
        const point = worldPoint(index, bounds.cols, bounds.pitch);
        intent.current.x = point.x;
        intent.current.y = point.y;
        centeredRef.current = true;
      }
      const hero = heroRef.current;
      const index = heroIndex(manifest.count);
      const src = manifest.piece(index)?.src;
      if (hero && src && hero.dataset.src !== src) {
        hero.dataset.src = src;
        heroReady.current = false;
        hero.src = src;
        if (hero.complete && hero.naturalWidth > 0) {
          heroReady.current = true;
        }
      }
      if (reducedRef.current) {
        settledRef.current = true;
        stageRef.current?.setAttribute("data-hide", "true");
      }
    };
    prepareRef.current = prepare;

    let lastFrame = 0;
    const frame = (now: number) => {
      const dt = Math.min(34, now - lastFrame);
      lastFrame = now;
      const moving = stepMotion(now, dt);
      draw();
      rafRef.current = moving ? window.requestAnimationFrame(frame) : 0;
    };

    const kick = () => {
      if (rafRef.current) {
        return;
      }
      lastFrame = performance.now();
      rafRef.current = window.requestAnimationFrame(frame);
    };

    const stepMotion = (now: number, dt: number) => {
      const manifest = manifestRef.current;
      if (!manifest) {
        return false;
      }
      const bounds = boundsFor(manifest.count);
      if (reducedRef.current) {
        motionRef.current = { kind: "idle" };
        intent.current.x = clamp(intent.current.x, bounds.minX, bounds.maxX);
        intent.current.y = clamp(intent.current.y, bounds.minY, bounds.maxY);
        return false;
      }
      const motion = motionRef.current;
      switch (motion.kind) {
        case "idle":
          return false;
        case "momentum": {
          intent.current.x += motion.vx * dt;
          intent.current.y += motion.vy * dt;
          const decay = Math.exp((-6 * dt) / 1000);
          motion.vx *= decay;
          motion.vy *= decay;
          if (intent.current.x < bounds.minX) {
            intent.current.x = bounds.minX;
            motion.vx = 0;
          } else if (intent.current.x > bounds.maxX) {
            intent.current.x = bounds.maxX;
            motion.vx = 0;
          }
          if (intent.current.y < bounds.minY) {
            intent.current.y = bounds.minY;
            motion.vy = 0;
          } else if (intent.current.y > bounds.maxY) {
            intent.current.y = bounds.maxY;
            motion.vy = 0;
          }
          if (Math.hypot(motion.vx, motion.vy) < 0.02) {
            motionRef.current = { kind: "idle" };
            return false;
          }
          return true;
        }
        case "glide": {
          const amount = Math.min(1, (now - motion.start) / motion.duration);
          const eased = motion.ease(amount);
          intent.current.x = motion.fromX + (motion.toX - motion.fromX) * eased;
          intent.current.y = motion.fromY + (motion.toY - motion.fromY) * eased;
          if (amount >= 1) {
            motionRef.current = { kind: "idle" };
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

    const startGlide = (
      toX: number,
      toY: number,
      duration: number,
      ease: (amount: number) => number,
    ) => {
      if (duration <= 0) {
        intent.current.x = toX;
        intent.current.y = toY;
        motionRef.current = { kind: "idle" };
        draw();
        return;
      }
      motionRef.current = {
        kind: "glide",
        fromX: intent.current.x,
        fromY: intent.current.y,
        toX,
        toY,
        start: performance.now(),
        duration,
        ease,
      };
      kick();
    };

    const settleEdges = (vx = 0, vy = 0) => {
      const manifest = manifestRef.current;
      if (!manifest) {
        return;
      }
      const bounds = boundsFor(manifest.count);
      if (edgeSoft.current) {
        intent.current.x = applyRubber(intent.current.x, bounds.minX, bounds.maxX);
        intent.current.y = applyRubber(intent.current.y, bounds.minY, bounds.maxY);
        edgeSoft.current = false;
      }
      const toX = clamp(intent.current.x, bounds.minX, bounds.maxX);
      const toY = clamp(intent.current.y, bounds.minY, bounds.maxY);
      const outside =
        Math.abs(toX - intent.current.x) > 0.5 || Math.abs(toY - intent.current.y) > 0.5;
      if (outside) {
        startGlide(toX, toY, reducedRef.current ? 0 : RUBBER_MS, easeOut);
        return;
      }
      if (reducedRef.current || Math.hypot(vx, vy) < 0.15) {
        motionRef.current = { kind: "idle" };
        draw();
        return;
      }
      motionRef.current = { kind: "momentum", vx, vy };
      kick();
    };

    const hideHint = () => {
      if (hintHidden.current) {
        return;
      }
      hintHidden.current = true;
      hintRef.current?.setAttribute("data-hide", "true");
    };

    const localPoint = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const hitTest = (x: number, y: number) => {
      let best: number | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const item of placedRef.current) {
        const half = (viewport.current.cell * item.scale) / 2 + TAP_SLOP;
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

    const samples: { x: number; y: number; t: number }[] = [];
    let dragOriginX = 0;
    let dragOriginY = 0;
    let lastX = 0;
    let lastY = 0;
    let dragging = false;

    pointerDownRef.current = (event: PointerEvent) => {
      if (event.button !== 0 || activePointer.current != null) {
        return;
      }
      activePointer.current = event.pointerId;
      root.setPointerCapture(event.pointerId);
      motionRef.current = { kind: "idle" };
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      dragging = false;
      dragOriginX = event.clientX;
      dragOriginY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      samples.length = 0;
      samples.push({ x: event.clientX, y: event.clientY, t: performance.now() });
      edgeSoft.current = true;
      const point = localPoint(event);
      pressedRef.current = hitTest(point.x, point.y);
      draw();
    };

    pointerMoveRef.current = (event: PointerEvent) => {
      if (event.pointerId !== activePointer.current) {
        return;
      }
      const total = Math.hypot(event.clientX - dragOriginX, event.clientY - dragOriginY);
      if (!dragging && total < DRAG_SLOP) {
        return;
      }
      if (!dragging) {
        pressedRef.current = null;
      }
      dragging = true;
      hideHint();
      root.dataset.dragging = "true";
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      const now = performance.now();
      samples.push({ x: event.clientX, y: event.clientY, t: now });
      while (samples.length > 0 && samples[0] && now - samples[0].t > 90) {
        samples.shift();
      }
      const manifest = manifestRef.current;
      if (manifest && reducedRef.current) {
        const bounds = boundsFor(manifest.count);
        intent.current.x = clamp(intent.current.x - dx, bounds.minX, bounds.maxX);
        intent.current.y = clamp(intent.current.y - dy, bounds.minY, bounds.maxY);
      } else {
        intent.current.x -= dx;
        intent.current.y -= dy;
      }
      draw();
    };

    pointerUpRef.current = (event: PointerEvent) => {
      if (event.pointerId !== activePointer.current) {
        return;
      }
      activePointer.current = null;
      pressedRef.current = null;
      delete root.dataset.dragging;
      const wasDrag = dragging;
      dragging = false;
      if (!wasDrag) {
        edgeSoft.current = false;
        const point = localPoint(event);
        const index = hitTest(point.x, point.y);
        const manifest = manifestRef.current;
        const focus = focusRef.current?.index;
        if (manifest && index != null && index !== focus) {
          hideHint();
          const bounds = boundsFor(manifest.count);
          const target = worldPoint(index, bounds.cols, bounds.pitch);
          startGlide(target.x, target.y, reducedRef.current ? 0 : GLIDE_MS, easeInOut);
          return;
        }
        draw();
        return;
      }
      let vx = 0;
      let vy = 0;
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (first && last && last.t > first.t) {
        const dt = last.t - first.t;
        vx = (first.x - last.x) / dt;
        vy = (first.y - last.y) / dt;
      }
      settleEdges(vx, vy);
    };

    moveImpl.current = (dCol: number, dRow: number) => {
      const manifest = manifestRef.current;
      const focus = focusRef.current?.index;
      if (!manifest || focus == null) {
        return;
      }
      const bounds = boundsFor(manifest.count);
      const next = neighborIndex(focus, dCol, dRow, bounds.cols, manifest.count);
      if (next === focus) {
        return;
      }
      hideHint();
      edgeSoft.current = false;
      motionRef.current = { kind: "idle" };
      const target = worldPoint(next, bounds.cols, bounds.pitch);
      intent.current.x = target.x;
      intent.current.y = target.y;
      draw();
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      pointerDownRef.current(event);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerMoveRef.current(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      pointerUpRef.current(event);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      hideHint();
      motionRef.current = { kind: "idle" };
      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (event.deltaMode === 2) {
        dx *= viewport.current.width;
        dy *= viewport.current.height;
      }
      if (event.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }
      const manifest = manifestRef.current;
      if (manifest && reducedRef.current) {
        const bounds = boundsFor(manifest.count);
        intent.current.x = clamp(intent.current.x + dx, bounds.minX, bounds.maxX);
        intent.current.y = clamp(intent.current.y + dy, bounds.minY, bounds.maxY);
        edgeSoft.current = false;
      } else {
        edgeSoft.current = true;
        intent.current.x += dx;
        intent.current.y += dy;
      }
      draw();
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        settleEdges();
      }, 120);
    };
    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("contextmenu", onContextMenu);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("contextmenu", onContextMenu);
      window.clearTimeout(wheelTimer.current);
      window.clearTimeout(settleTimer.current);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    moveRef.current = (columnDelta, rowDelta) => {
      moveImpl.current(columnDelta, rowDelta);
    };
    return () => {
      moveRef.current = () => {};
    };
  }, [moveRef]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const nextCell = cellSize(Math.min(rect.width || window.innerWidth, rect.height || window.innerHeight));
    const previousCell = viewport.current.cell;
    if (centeredRef.current && previousCell > 0 && previousCell !== nextCell) {
      const scale = (nextCell + 16) / (previousCell + 16);
      intent.current.x *= scale;
      intent.current.y *= scale;
    }
    viewport.current = {
      width: rect.width || window.innerWidth,
      height: rect.height || window.innerHeight,
      cell: nextCell,
    };
    root.style.setProperty("--cell", `${nextCell}px`);

    if (closing && !reducedMotion) {
      if (!closePlaced.current) {
        closePlaced.current = true;
        if (revealed) {
          edgeSoft.current = false;
          motionRef.current = { kind: "idle" };
          window.clearTimeout(settleTimer.current);
          drawRef.current();
          positionStageForClose(stage, focusRef.current);
        }
      }
      return;
    }

    prepareRef.current();
    if (
      revealed &&
      manifestRef.current &&
      heroReady.current &&
      !reducedMotion &&
      !settledRef.current &&
      !settleTimer.current
    ) {
      stage.dataset.landed = "true";
      settleTimer.current = window.setTimeout(() => {
        settledRef.current = true;
        stage.dataset.hide = "true";
        drawRef.current();
      }, 200);
    }

    drawRef.current();
  });

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) {
      return;
    }
    const markReady = () => {
      heroReady.current = true;
      const stage = stageRef.current;
      if (!stage || reducedRef.current || closingRef.current || !revealedRef.current) {
        return;
      }
      stage.dataset.landed = "true";
      if (!settledRef.current && !settleTimer.current) {
        settleTimer.current = window.setTimeout(() => {
          settledRef.current = true;
          stage.dataset.hide = "true";
          drawRef.current();
        }, 200);
      }
    };
    hero.addEventListener("load", markReady);
    hero.addEventListener("error", markReady);
    return () => {
      hero.removeEventListener("load", markReady);
      hero.removeEventListener("error", markReady);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="collection-lens"
      data-pixelated={collectionIsPixelated(id) ? "true" : undefined}
      data-reduced={reducedMotion ? "true" : undefined}
      data-closing={closing ? "true" : undefined}
      role="application"
      aria-label={`${fallbackTitle} collection`}
      aria-describedby="collection-hint"
    >
      <div ref={fieldRef} className="collection-field" />
      <span ref={setStageNode} className="collection-stage">
        {/* Remote thumbs are virtualized and must not pass through the image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-poster src={poster} alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={heroRef} data-hero alt="" draggable={false} />
      </span>
      <p ref={hintRef} className="collection-hint" id="collection-hint">
        Drag, scroll, or use arrow keys.
      </p>
    </div>
  );
}

function positionStageForClose(stage: HTMLSpanElement, focus: Focus | null) {
  if (!focus || focus.size <= 0) {
    return;
  }
  stage.dataset.instant = "true";
  delete stage.dataset.hide;
  delete stage.dataset.landed;
  stage.style.left = `${focus.x}px`;
  stage.style.top = `${focus.y}px`;
  stage.style.width = `${focus.size}px`;
  stage.style.height = `${focus.size}px`;
  stage.style.marginLeft = `${-focus.size / 2}px`;
  stage.style.marginTop = `${-focus.size / 2}px`;
  stage.style.transform = "none";
  stage.style.opacity = "1";
  const poster = stage.querySelector("[data-poster]");
  const hero = stage.querySelector("[data-hero]");
  if (hero instanceof HTMLImageElement && focus.src) {
    hero.src = focus.src;
    hero.style.opacity = "1";
    hero.style.filter = "none";
  }
  if (poster instanceof HTMLImageElement) {
    poster.style.opacity = "0";
  }
}

export const CollectionLens = memo(CollectionLensView);
