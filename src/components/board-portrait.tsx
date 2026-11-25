"use client";

import { useReducedMotion, useSpring } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type AdapterOptions = {
  powerPreference?: "low-power" | "high-performance";
};

type GpuAdapterHost = {
  requestAdapter: (options?: AdapterOptions) => Promise<unknown>;
};

const patchedGpuAdapters = new WeakSet<GpuAdapterHost>();

// Phones often have WebGPU but return no adapter when powerPreference is
// high-performance. Retry without that preference, then with low-power.
function preferAnyWebGPUAdapter() {
  const gpu = readGpu(navigator);
  if (!gpu || patchedGpuAdapters.has(gpu)) return;
  patchedGpuAdapters.add(gpu);
  const requestAdapter = gpu.requestAdapter.bind(gpu);
  gpu.requestAdapter = async (options) => {
    const first = await requestQuiet(requestAdapter, options);
    if (first || !options?.powerPreference) return first;
    const relaxed = await requestQuiet(requestAdapter, omitPowerPreference(options));
    if (relaxed) return relaxed;
    return requestQuiet(requestAdapter, {
      ...omitPowerPreference(options),
      powerPreference: "low-power",
    });
  };
}

function readGpu(host: Navigator): GpuAdapterHost | undefined {
  const candidate = host as Navigator & { gpu?: { requestAdapter?: unknown } };
  if (!candidate.gpu || typeof candidate.gpu.requestAdapter !== "function") return undefined;
  return candidate.gpu as GpuAdapterHost;
}

function omitPowerPreference(options: AdapterOptions): AdapterOptions {
  const rest: AdapterOptions = { ...options };
  delete rest.powerPreference;
  return rest;
}

async function requestQuiet(
  requestAdapter: GpuAdapterHost["requestAdapter"],
  options?: AdapterOptions,
) {
  try {
    return await requestAdapter(options);
  } catch {
    return null;
  }
}

if (typeof navigator !== "undefined") preferAnyWebGPUAdapter();

function loadPortraitShader() {
  return import("@/components/board-portrait-shader");
}

const PortraitShader = dynamic(
  () => loadPortraitShader().then((mod) => mod.BoardPortraitShader),
  { ssr: false, loading: () => null },
);

type PlayPhase = "still" | "hover" | "liquid";

const PORTRAIT_SPRING = { visualDuration: 0.22, bounce: 0.3 };

const RIPPLE_DECAY = 7;
const RIPPLE_SETTLE_MS = rippleSettleMs(RIPPLE_DECAY);

function rippleSettleMs(decay: number) {
  const dampFactor = 1 - decay * 0.004;
  if (dampFactor >= 1) return 8000;
  const frames = Math.log(1e-6) / Math.log(Math.max(dampFactor, 0.001));
  return Math.min(30000, Math.ceil(frames * 16.67));
}

export function BoardPortrait({ src }: { src?: string }) {
  const reduced = useReducedMotion();
  const portraitRef = useRef<HTMLDivElement>(null);
  const size = useSpring(0, PORTRAIT_SPRING);
  const [gpu, setGpu] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<PlayPhase>("still");
  const [melt, setMelt] = useState(0);
  const [settling, setSettling] = useState(false);
  const phaseRef = useRef<PlayPhase>("still");
  const insideRef = useRef(false);
  const settlingRef = useRef(false);
  const rippleRef = useRef<number | null>(null);
  const gestureRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setGpu("gpu" in navigator);
  }, []);

  useLayoutEffect(() => {
    const portrait = portraitRef.current;
    if (!portrait || reduced !== false) {
      portrait?.style.removeProperty("--portrait-p");
      return;
    }

    const board = portrait.closest(".home-board");
    if (!(board instanceof HTMLElement)) return;

    const readLeave = () => {
      const rail = Number.parseFloat(getComputedStyle(board).getPropertyValue("--rail"));
      if (!Number.isFinite(rail)) return 0;
      return Math.min(1, Math.max(0, rail * 10));
    };

    const apply = (value: number) => {
      portrait.style.setProperty("--portrait-p", value.toFixed(4));
    };

    const desktop = window.matchMedia("(min-width: 720px)");
    let target = readLeave();
    let following = desktop.matches;
    if (following) {
      size.jump(target);
      apply(size.get());
    }
    const stop = size.on("change", apply);

    let frame = 0;
    const follow = () => {
      if (!desktop.matches) {
        if (following) {
          following = false;
          target = 0;
          size.jump(0);
          portrait.style.removeProperty("--portrait-p");
        }
      } else if (!following) {
        following = true;
        target = readLeave();
        size.jump(target);
        apply(size.get());
      } else {
        const next = readLeave();
        if (Math.abs(next - target) > 0.0001) {
          target = next;
          size.set(next);
        }
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => {
      cancelAnimationFrame(frame);
      stop();
      portrait.style.removeProperty("--portrait-p");
    };
  }, [reduced, size]);

  useEffect(() => {
    return () => {
      if (rippleRef.current !== null) window.clearTimeout(rippleRef.current);
    };
  }, []);

  const canPlay = reduced === false && gpu && !failed && Boolean(src);

  function setPlay(next: PlayPhase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function clearRipple() {
    if (rippleRef.current === null) return;
    window.clearTimeout(rippleRef.current);
    rippleRef.current = null;
  }

  function releaseRipples() {
    clearRipple();
    rippleRef.current = window.setTimeout(() => {
      rippleRef.current = null;
      if (!insideRef.current && phaseRef.current === "hover") setPlay("still");
    }, RIPPLE_SETTLE_MS);
  }

  function releaseLiquid() {
    if (phaseRef.current !== "liquid" || settlingRef.current) return;
    settlingRef.current = true;
    setSettling(true);
  }

  const onReleaseSettled = useCallback(() => {
    if (!settlingRef.current || phaseRef.current !== "liquid") return;
    settlingRef.current = false;
    setSettling(false);
    setPlay(insideRef.current ? "hover" : "still");
  }, []);

  return (
    <div
      ref={portraitRef}
      className="board-portrait"
      data-play={canPlay && phase !== "still" ? phase : undefined}
      onPointerEnter={() => {
        insideRef.current = true;
        clearRipple();
        if (!canPlay || phaseRef.current === "liquid") return;
        setPlay("hover");
      }}
      onPointerLeave={() => {
        insideRef.current = false;
        if (phaseRef.current === "liquid") return;
        releaseRipples();
      }}
      onPointerDown={(event) => {
        if (!canPlay) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        settlingRef.current = false;
        setSettling(false);
        setMelt((value) => value + 1);
        setPlay("liquid");
        if (event.pointerType === "touch") {
          gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          return;
        }
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The pointer is already gone, or this event cannot capture.
        }
      }}
      onPointerMove={(event) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.id !== event.pointerId) return;
        const dx = event.clientX - gesture.x;
        const dy = event.clientY - gesture.y;
        if (Math.hypot(dx, dy) < 8) return;
        gestureRef.current = null;
        if (Math.abs(dy) >= Math.abs(dx)) {
          releaseLiquid();
          return;
        }
        event.currentTarget.setAttribute("data-gesture", "");
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The pointer is already gone, or this event cannot capture.
        }
      }}
      onPointerUp={(event) => {
        gestureRef.current = null;
        event.currentTarget.removeAttribute("data-gesture");
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        releaseLiquid();
      }}
      onPointerCancel={(event) => {
        gestureRef.current = null;
        event.currentTarget.removeAttribute("data-gesture");
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        releaseLiquid();
      }}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      {src ? (
        <Image src={src} alt="" fill preload draggable={false} sizes="(max-width: 719px) 100vw, 218px" />
      ) : null}
      {src && canPlay ? (
        <PortraitShader
          src={src}
          phase={phase}
          melt={melt}
          settling={settling}
          onReleaseSettled={onReleaseSettled}
          onUnavailable={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
