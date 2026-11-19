"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

function loadPortraitShader() {
  return import("@/components/board-portrait-shader");
}

const PortraitShader = dynamic(
  () => loadPortraitShader().then((mod) => mod.BoardPortraitShader),
  { ssr: false, loading: () => null },
);

type PlayPhase = "still" | "hover" | "liquid";

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
  const [gpu, setGpu] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<PlayPhase>("still");
  const [melt, setMelt] = useState(0);
  const [settling, setSettling] = useState(false);
  const phaseRef = useRef<PlayPhase>("still");
  const insideRef = useRef(false);
  const settlingRef = useRef(false);
  const rippleRef = useRef<number | null>(null);

  useEffect(() => {
    setGpu("gpu" in navigator);
  }, []);

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
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The pointer is already gone, or this event cannot capture.
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        releaseLiquid();
      }}
      onPointerCancel={(event) => {
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
