"use client";

import { useEffect, useRef } from "react";

import { mountBoardJelly } from "@/components/board-jelly-scene";

export function BoardJelly() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let dispose: (() => void) | undefined;
    let cancel = false;
    mountBoardJelly(canvas).then((stop) => {
      if (cancel) {
        stop();
        return;
      }
      dispose = stop;
    });

    return () => {
      cancel = true;
      dispose?.();
    };
  }, []);

  return (
    <div className="board-jelly">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
