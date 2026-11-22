"use client";

import { Shader, WaveDistortion } from "shaders/react";

export function CardShaderFill({ onUnavailable }: { onUnavailable: () => void }) {
  return (
    <Shader
      className="card-media-shader"
      colorSpace="srgb"
      toneMapping="linear"
      disableTelemetry
      onUnavailable={onUnavailable}
      aria-hidden
    >
      <WaveDistortion
        strength={0.035}
        frequency={1.1}
        speed={0.22}
        angle={18}
        waveType="sine"
        edges="stretch"
      />
    </Shader>
  );
}
