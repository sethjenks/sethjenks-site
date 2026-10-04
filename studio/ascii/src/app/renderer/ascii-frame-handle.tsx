import * as React from "react";

import { useToolcraft } from "@/toolcraft/runtime/react";
import { createControlHistoryGroupId } from "@/toolcraft/ui";

const HANDLE_SIZE = 16;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function readOffset(value: unknown): { x: number; y: number } {
  if (value && typeof value === "object") {
    const record = value as { x?: unknown; y?: unknown };
    return {
      x: clamp(Number(record.x) || 0, -1, 1),
      y: clamp(Number(record.y) || 0, -1, 1),
    };
  }
  return { x: 0, y: 0 };
}

function offsetValue(x: number, y: number): { x: string; y: string } {
  return {
    x: clamp(x, -1, 1).toFixed(2),
    y: clamp(y, -1, 1).toFixed(2),
  };
}

export function useAsciiFrameDrag(
  plateRef: React.RefObject<HTMLElement | null>,
): (event: React.PointerEvent<HTMLElement>) => void {
  const { dispatch, state } = useToolcraft();
  const historyGroupRef = React.useRef("");

  const commitOffset = React.useCallback(
    (x: number, y: number) => {
      dispatch({
        history: "merge",
        historyGroup: historyGroupRef.current,
        label: "Frame offset",
        target: "frame.offset",
        type: "controls.setValue",
        value: offsetValue(x, y),
      });
    },
    [dispatch],
  );

  return React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey) return;
      const plate = plateRef.current;
      if (!plate) return;

      event.preventDefault();
      event.stopPropagation();
      const bounds = plate.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;

      const start = readOffset(state.values["frame.offset"]);
      const originX = event.clientX;
      const originY = event.clientY;
      historyGroupRef.current = createControlHistoryGroupId("frame-offset");
      event.currentTarget.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - originX) / (bounds.width / 2);
        const dy = (moveEvent.clientY - originY) / (bounds.height / 2);
        commitOffset(start.x + dx, start.y + dy);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [commitOffset, plateRef, state.values],
  );
}

export function AsciiFrameHandle({
  plateRef,
}: {
  plateRef: React.RefObject<HTMLElement | null>;
}): React.JSX.Element {
  const onPointerDown = useAsciiFrameDrag(plateRef);

  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#111111] bg-[#111111]/35"
      data-testid="ascii-frame-handle"
      data-toolcraft-canvas-handle="frame-offset"
      onPointerDown={onPointerDown}
      style={{ height: HANDLE_SIZE, width: HANDLE_SIZE }}
    />
  );
}
