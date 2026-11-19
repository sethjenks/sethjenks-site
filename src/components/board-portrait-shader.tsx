"use client";

import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CursorRipples, ImageTexture, Liquify, Shader, WaveDistortion } from "shaders/react";

type PortraitPhase = "still" | "hover" | "liquid";

const LIQUID_INTENSITY = 11;
const LIQUID_RELEASE_S = 2.6;

type BoardPortraitShaderProps = {
  src: string;
  phase: PortraitPhase;
  melt: number;
  settling: boolean;
  onReleaseSettled: () => void;
  onUnavailable: () => void;
};

export function BoardPortraitShader({
  src,
  phase,
  melt,
  settling,
  onReleaseSettled,
  onUnavailable,
}: BoardPortraitShaderProps) {
  const [splash, setSplash] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const intensityRef = useRef(0);
  const onReleaseSettledRef = useRef(onReleaseSettled);
  onReleaseSettledRef.current = onReleaseSettled;

  useEffect(() => {
    if (phase !== "liquid") {
      intensityRef.current = 0;
      setIntensity(0);
      return;
    }

    const from = intensityRef.current;
    if (!settling && from === 0) {
      intensityRef.current = LIQUID_INTENSITY;
      setIntensity(LIQUID_INTENSITY);
      return;
    }

    const run = animate(from, settling ? 0 : LIQUID_INTENSITY, {
      duration: settling ? LIQUID_RELEASE_S : 0.18,
      ease: settling ? [0.25, 0.1, 0.25, 1] : [0.2, 0, 0, 1],
      onUpdate(value) {
        intensityRef.current = value;
        setIntensity(value);
      },
      onComplete() {
        if (settling) onReleaseSettledRef.current();
      },
    });

    return () => {
      run.stop();
    };
  }, [melt, phase, settling]);

  useEffect(() => {
    if (phase !== "liquid") {
      setSplash(0);
      return;
    }

    const run = animate(0, 1, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(progress) {
        setSplash(Math.sin(Math.PI * progress) * 0.12);
      },
      onComplete() {
        setSplash(0);
      },
    });

    return () => {
      run.stop();
    };
  }, [melt, phase]);

  return (
    <Shader
      className="board-portrait-shader"
      colorSpace="srgb"
      toneMapping="linear"
      disableTelemetry
      onUnavailable={onUnavailable}
      aria-hidden
    >
      <ImageTexture url={src} objectFit="cover" />
      <PortraitWarp phase={phase} splash={splash} intensity={intensity} settling={settling} />
    </Shader>
  );
}

function PortraitWarp({
  phase,
  splash,
  intensity,
  settling,
}: {
  phase: PortraitPhase;
  splash: number;
  intensity: number;
  settling: boolean;
}) {
  switch (phase) {
    case "still":
      return null;
    case "hover":
      return (
        <CursorRipples
          intensity={10}
          decay={7}
          radius={0.36}
          chromaticSplit={0.5}
          edges="stretch"
        />
      );
    case "liquid":
      return (
        <>
          <Liquify
            intensity={intensity}
            stiffness={2.2}
            damping={3.2}
            radius={settling ? 0 : 0.62}
            edges="stretch"
          />
          <WaveDistortion
            strength={splash}
            frequency={1.6}
            speed={0.8}
            angle={80}
            waveType="sine"
            edges="stretch"
          />
        </>
      );
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}
