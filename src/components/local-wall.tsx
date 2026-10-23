"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { getBoardMode, notifyBoard, publishBoard, subscribeBoard } from "@/lib/monsters/board";
import type { BoardSelection } from "@/lib/monsters/board";
import { composeDrawing } from "@/lib/monsters/compose";
import { inkPath, pathLength } from "@/lib/monsters/ink";
import { boxHitsStroke, normalizeBox, pointHitsStroke } from "@/lib/monsters/pick";
import type { InkPoint } from "@/lib/monsters/types";

const PEN_WIDTH = 3.5;
const EMPTY: BoardSelection = { draws: 0, other: 0, total: 0 };

type LocalStroke = {
  id: string;
  points: InkPoint[];
  closed: boolean;
};

function isClosed(points: InkPoint[]): boolean {
  if (points.length < 8) {
    return false;
  }
  const start = points[0];
  const end = points[points.length - 1];
  return Math.hypot(start.x - end.x, start.y - end.y) < 18 && pathLength(points) > 48;
}

export function LocalWall() {
  const mode = useSyncExternalStore(subscribeBoard, getBoardMode, () => "pen" as const);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<SVGPathElement>(null);
  const lassoRef = useRef<SVGRectElement>(null);
  const strokesRef = useRef<LocalStroke[]>([]);
  const selectedRef = useRef<string[]>([]);
  const selectionRef = useRef<BoardSelection>(EMPTY);
  const drawingRef = useRef<LocalStroke | null>(null);
  const lassoPoints = useRef<{ start: InkPoint; end: InkPoint } | null>(null);
  const [strokes, setStrokes] = useState<LocalStroke[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    strokesRef.current = strokes;
    selectedRef.current = selected;
    const next = { draws: selected.length, other: 0, total: strokes.length };
    const current = selectionRef.current;
    selectionRef.current =
      current.draws === next.draws && current.total === next.total ? current : next;
    notifyBoard();
  }, [selected, strokes]);

  useEffect(() => {
    publishBoard({
      getSelection: () => selectionRef.current,
      extract: () => {
        const surface = surfaceRef.current;
        if (!surface) {
          return null;
        }
        const rect = surface.getBoundingClientRect();
        const chosen =
          selectedRef.current.length > 0
            ? strokesRef.current.filter((stroke) => selectedRef.current.includes(stroke.id))
            : strokesRef.current;
        return composeDrawing(
          chosen.map((stroke) => ({
            id: stroke.id,
            width: PEN_WIDTH,
            closed: stroke.closed,
            points: stroke.points.map((point) => ({
              x: point.x + rect.left,
              y: point.y + rect.top,
            })),
          })),
        );
      },
    });
    return () => publishBoard(null);
  }, []);

  function localPoint(event: PointerEvent<HTMLDivElement>): InkPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    if (getBoardMode() === "select") {
      lassoPoints.current = { start: point, end: point };
      const lasso = lassoRef.current;
      if (lasso) {
        lasso.setAttribute("x", String(point.x));
        lasso.setAttribute("y", String(point.y));
        lasso.setAttribute("width", "0");
        lasso.setAttribute("height", "0");
        lasso.hidden = false;
      }
      return;
    }
    const stroke: LocalStroke = {
      id: `ink-${crypto.randomUUID()}`,
      points: [point],
      closed: false,
    };
    drawingRef.current = stroke;
    const draft = draftRef.current;
    if (draft) {
      draft.setAttribute("d", "");
      draft.hidden = false;
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    const point = localPoint(event);
    const lasso = lassoPoints.current;
    if (lasso) {
      lasso.end = point;
      const box = normalizeBox(lasso.start, lasso.end);
      const mark = lassoRef.current;
      if (mark) {
        mark.setAttribute("x", String(box.x));
        mark.setAttribute("y", String(box.y));
        mark.setAttribute("width", String(box.w));
        mark.setAttribute("height", String(box.h));
      }
      return;
    }
    const drawing = drawingRef.current;
    if (!drawing) {
      return;
    }
    const last = drawing.points[drawing.points.length - 1];
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 1.5) {
      return;
    }
    drawing.points.push(point);
    draftRef.current?.setAttribute("d", inkPath(drawing.points));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const lasso = lassoPoints.current;
    if (lasso) {
      lassoPoints.current = null;
      if (lassoRef.current) {
        lassoRef.current.hidden = true;
      }
      const box = normalizeBox(lasso.start, lasso.end);
      const tap = box.w < 6 && box.h < 6;
      const next = strokesRef.current
        .filter((stroke) =>
          tap
            ? pointHitsStroke(stroke.points, lasso.start, 14)
            : boxHitsStroke(stroke.points, box),
        )
        .map((stroke) => stroke.id);
      setSelected(tap ? next.slice(0, 1) : next);
      return;
    }
    const drawing = drawingRef.current;
    drawingRef.current = null;
    if (draftRef.current) {
      draftRef.current.hidden = true;
      draftRef.current.setAttribute("d", "");
    }
    if (!drawing || drawing.points.length === 0) {
      return;
    }
    drawing.closed = isClosed(drawing.points);
    setStrokes((current) => [...current, drawing]);
    setSelected([]);
  }

  return (
    <div
      ref={surfaceRef}
      className="local-wall"
      data-mode={mode}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="local-wall-svg" aria-hidden="true">
        {strokes.map((stroke) => (
          <InkMark
            key={stroke.id}
            stroke={stroke}
            selected={selected.includes(stroke.id)}
          />
        ))}
        <path ref={draftRef} className="local-ink" hidden strokeWidth={PEN_WIDTH} />
        <rect ref={lassoRef} className="local-lasso" hidden />
      </svg>
      <span className="sr-only">
        {mode === "select"
          ? "Select is on. Drag around strokes."
          : "Pen is on. Draw in black."}
      </span>
    </div>
  );
}

function InkMark({ stroke, selected }: { stroke: LocalStroke; selected: boolean }) {
  const d = inkPath(stroke.points);
  if (!d) {
    const point = stroke.points[0] ?? { x: 0, y: 0 };
    return (
      <circle
        data-ink-id={stroke.id}
        data-selected={selected ? "true" : "false"}
        className="local-ink"
        cx={point.x}
        cy={point.y}
        r={PEN_WIDTH}
      />
    );
  }
  return (
    <path
      data-ink-id={stroke.id}
      data-selected={selected ? "true" : "false"}
      className="local-ink"
      d={d}
      strokeWidth={PEN_WIDTH}
    />
  );
}
