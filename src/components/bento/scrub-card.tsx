"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { BentoFrame } from "@/components/bento/card";
import { useBentoGesture } from "@/components/bento/gesture";
import { ScrubStage } from "@/components/bento/scrub";

const STEPS = 8;

export function ScrubCard() {
  const gesture = useBentoGesture("moment");
  const [step, setStep] = useState(0);
  const ratio = gesture.reduced ? 0 : gesture.hover ? gesture.point.x : step / (STEPS - 1);
  const showFilm = !gesture.reduced && ratio > 0.02 && (gesture.hover || step > 0);

  function advance(event: KeyboardEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (gesture.reduced) {
      return;
    }
    setStep((current) => (current + 1) % STEPS);
  }

  return (
    <BentoFrame
      id="scrub"
      surface="photo"
      sentenceId="scrub-sentence"
      gesture={gesture}
      pressed={step > 0}
      caption="Headshots"
      handlers={{
        onPointerUp: (event) => {
          if (event.pointerType === "touch") {
            advance(event);
          }
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
            advance(event);
          }
        },
      }}
    >
      <ScrubStage ratio={ratio} showFilm={showFilm} />
    </BentoFrame>
  );
}
