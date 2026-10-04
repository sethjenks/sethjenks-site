import * as React from "react";

import { paintPlate, type PlateRecipe } from "@ascii-plate";
import {
  createToolcraftPngExportCanvas,
  getToolcraftTimelineLoopProgress,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import { geistMonoReady } from "../geist-mono";
import { AsciiFrameHandle, useAsciiFrameDrag } from "./ascii-frame-handle";
import {
  buildAsciiPlateRecipe,
  getAsciiSourceAsset,
  loadAsciiSourceImage,
  readAsciiRenderSettings,
} from "./ascii-renderer";

function getRenderScale(state: ToolcraftState): number {
  const value = Number(state.values["canvas.renderScale"]);
  return Number.isFinite(value) ? Math.max(1, value) : 1;
}

export function AsciiCanvas(): React.JSX.Element {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const recipeRef = React.useRef<PlateRecipe | null>(null);
  const onFrameDrag = useAsciiFrameDrag(canvasRef);
  const interactingRef = React.useRef(false);
  const source = getAsciiSourceAsset(state);
  const settings = React.useMemo(
    () => ({
      ...readAsciiRenderSettings(state),
      includeBackground: shouldIncludeToolcraftPreviewBackground({ state }),
    }),
    [state.values],
  );
  const transformKey = JSON.stringify(source?.transform ?? null);
  const sourceKey = source
    ? `${source.id}:${source.dataUrl.length}:${transformKey}`
    : "empty";
  const sampleKey = [
    sourceKey,
    settings.columns,
    settings.contrast,
    settings.invert,
    settings.frame.x,
    settings.frame.y,
    settings.frame.zoom,
    state.canvas.size.width,
    state.canvas.size.height,
  ].join(":");
  const renderScale = getRenderScale(state);
  const progress = getToolcraftTimelineLoopProgress(state.timeline);
  const looping = settings.motion.amount > 0;

  React.useEffect(() => {
    recipeRef.current = null;
  }, [
    sampleKey,
    settings.background,
    settings.characters,
    settings.field,
    settings.ink,
    settings.inks,
    settings.marks,
    settings.motion,
    settings.seed,
  ]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const slot = canvas.closest(
      "[data-toolcraft-canvas-slot], [data-toolcraft-canvas-world]",
    );
    const onDown = () => {
      interactingRef.current = true;
    };
    const onUp = () => {
      interactingRef.current = false;
    };
    slot?.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      slot?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let frame = 0;

    const render = async (loopProgress: number) => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = (window.devicePixelRatio || 1) * renderScale;
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));

      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, width, height);
      if (!source) return;

      await geistMonoReady;
      const image = await loadAsciiSourceImage(source);
      if (cancelled) return;

      if (!recipeRef.current) {
        recipeRef.current = buildAsciiPlateRecipe({
          asset: source,
          height,
          image,
          settings,
          width,
        });
      }

      paintPlate(
        context,
        recipeRef.current,
        {
          fontFamily:
            '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
          progress: loopProgress,
        },
        {
          height,
          includeBackground: settings.includeBackground,
          width,
        },
      );
    };

    const tick = () => {
      if (cancelled) return;
      const loopProgress = getToolcraftTimelineLoopProgress(state.timeline);
      if (!interactingRef.current) {
        void render(loopProgress);
      }
      if (looping && state.timeline.isPlaying) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const observer = new ResizeObserver(() => {
      recipeRef.current = null;
      void render(getToolcraftTimelineLoopProgress(state.timeline));
    });
    observer.observe(canvas);
    tick();

    return () => {
      cancelled = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [
    looping,
    progress,
    renderScale,
    sampleKey,
    settings,
    source,
    sourceKey,
    state.timeline,
  ]);

  return (
    <div className="relative size-full">
      <canvas
        aria-label="ASCII journal illustration"
        className="block size-full cursor-grab"
        data-ascii-columns={settings.columns}
        data-ascii-preset={String(state.values["ascii.preset"] ?? "journal")}
        data-toolcraft-product-output="ascii-journal-canvas"
        onPointerDown={source ? onFrameDrag : undefined}
        ref={canvasRef}
      />
      {source ? <AsciiFrameHandle plateRef={canvasRef} /> : null}
    </div>
  );
}

export async function renderAsciiExportCanvas({
  canvasSize,
  imageResolution,
  progress = 0,
  state,
}: {
  canvasSize?: { height: number; width: number };
  imageResolution: string;
  progress?: number;
  state: ToolcraftState;
}): Promise<HTMLCanvasElement> {
  const source = getAsciiSourceAsset(state);
  if (!source) {
    throw new Error("Add a source image before exporting.");
  }

  await geistMonoReady;
  const image = await loadAsciiSourceImage(source);
  const effectiveState = canvasSize
    ? {
        ...state,
        canvas: {
          ...state.canvas,
          size: {
            ...state.canvas.size,
            ...canvasSize,
          },
        },
      }
    : state;
  const settings = readAsciiRenderSettings(effectiveState);

  return createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground: settings.includeBackground,
    resolution: imageResolution,
    state: effectiveState,
    render: ({ context, cssHeight, cssWidth }) => {
      const recipe = buildAsciiPlateRecipe({
        asset: source,
        height: cssHeight,
        image,
        settings,
        width: cssWidth,
      });
      paintPlate(
        context,
        recipe,
        {
          fontFamily:
            '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
          progress,
        },
        {
          height: cssHeight,
          includeBackground: false,
          width: cssWidth,
        },
      );
    },
  });
}

export async function createAsciiPlateRecipeFromState(
  state: ToolcraftState,
): Promise<PlateRecipe> {
  const source = getAsciiSourceAsset(state);
  if (!source) {
    throw new Error("Add a source image before assigning a plate.");
  }
  await geistMonoReady;
  const image = await loadAsciiSourceImage(source);
  return buildAsciiPlateRecipe({
    asset: source,
    height: state.canvas.size.height,
    image,
    settings: readAsciiRenderSettings(state),
    width: state.canvas.size.width,
  });
}
