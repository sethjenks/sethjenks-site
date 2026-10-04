"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { paintPlate, parsePlateRecipe, type PlateRecipe } from "@/lib/ascii-plate";
import type { EntryMedia } from "@/lib/entries";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fontFamily(): string {
  const mono = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-mono")
    .trim();
  return mono
    ? `${mono}, "Geist Mono", ui-monospace, monospace`
    : '"Geist Mono", ui-monospace, monospace';
}

export function EntryPlateFigure({
  media,
  priority = false,
}: {
  media: EntryMedia;
  priority?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recipeRef = useRef<PlateRecipe | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const [live, setLive] = useState(false);
  const alt = media.alt ?? "";
  const plateSrc = media.plate;

  useEffect(() => {
    if (!plateSrc) return;

    let cancelled = false;
    let frame = 0;
    let visible = true;
    let start = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = (progress: number) => {
      const recipe = recipeRef.current;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context || !recipe) return;
      context.clearRect(0, 0, width, height);
      paintPlate(
        context,
        recipe,
        {
          fontFamily: fontFamily(),
          pointer: pointerRef.current,
          progress,
        },
        { height, includeBackground: true, width },
      );
    };

    const shouldLoop = () => {
      const recipe = recipeRef.current;
      return Boolean(
        recipe && recipe.motion.amount > 0 && !prefersReducedMotion(),
      );
    };

    const tick = (now: number) => {
      if (cancelled) return;
      const recipe = recipeRef.current;
      if (!recipe) return;
      if (start === 0) start = now;
      const loopMs = 3000;
      const progress =
        recipe.motion.amount > 0 ? ((now - start) / loopMs) % 1 : 0;
      if (visible) render(progress);
      if (visible && shouldLoop()) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry?.isIntersecting ?? false;
        if (nextVisible === visible) return;
        visible = nextVisible;
        if (!visible) {
          window.cancelAnimationFrame(frame);
          return;
        }
        if (shouldLoop()) {
          start = 0;
          frame = window.requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(canvas);

    const onPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      pointerRef.current = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
    };

    const onLeave = () => {
      pointerRef.current = { x: 0.5, y: 0.5 };
    };
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerleave", onLeave);

    void (async () => {
      const response = await fetch(plateSrc);
      if (!response.ok) return;
      const recipe = parsePlateRecipe(await response.json());
      if (cancelled) return;
      recipeRef.current = recipe;
      await document.fonts.ready;
      if (cancelled) return;
      setLive(true);
      if (prefersReducedMotion() || recipe.motion.amount === 0) {
        render(0);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      window.cancelAnimationFrame(frame);
    };
  }, [plateSrc]);

  return (
    <figure className="aluminum-frame overflow-hidden">
      <div className="relative aspect-[2/1] w-full">
        <Image
          src={media.src}
          alt={alt}
          fill
          unoptimized={media.src.endsWith(".svg")}
          priority={priority}
          sizes="(min-width: 672px) 42rem, 100vw"
          className={`object-cover ${live ? "opacity-0" : ""}`}
        />
        <canvas
          ref={canvasRef}
          aria-hidden={live ? undefined : true}
          aria-label={live ? alt || undefined : undefined}
          className="absolute inset-0 size-full"
        />
      </div>
    </figure>
  );
}
