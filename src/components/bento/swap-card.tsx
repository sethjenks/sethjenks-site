"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { BentoFrame } from "@/components/bento/card";
import { useBentoGesture } from "@/components/bento/gesture";
import { SAGE_BEATS, SwapStage } from "@/components/bento/swap";

export function SwapCard() {
  const gesture = useBentoGesture("moment");
  const [beat, setBeat] = useState(0);
  const shown = gesture.reduced ? 0 : beat;
  const frame = SAGE_BEATS[shown] ?? SAGE_BEATS[0];

  function step() {
    if (gesture.reduced) {
      return;
    }
    setBeat((current) => (current + 1) % SAGE_BEATS.length);
  }

  return (
    <BentoFrame
      id="swap"
      surface="photo"
      sentenceId="swap-sentence"
      gesture={gesture}
      pressed={shown > 0}
      caption={frame.label}
      handlers={{
        onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
          gesture.bind.onPointerEnter(event);
          if (event.pointerType !== "touch") {
            step();
          }
        },
        onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
          if (event.pointerType === "touch") {
            step();
          }
        },
        onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }
          event.preventDefault();
          step();
        },
      }}
    >
      <SwapStage beat={shown} />
    </BentoFrame>
  );
}
