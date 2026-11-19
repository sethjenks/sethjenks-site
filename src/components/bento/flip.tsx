"use client";

import Image from "next/image";
import type { BentoGesture } from "@/components/bento/gesture";

export function FlipStage({ gesture }: { gesture: BentoGesture }) {
  return (
    <span className="flip-scene">
      <span className="flip-inner" data-flipped={gesture.active ? "" : undefined}>
        <span className="flip-face flip-front">
          <Image
            src="/media/work/chia-signer-hero.jpg"
            alt=""
            fill
            sizes="(min-width: 800px) 40rem, 100vw"
            draggable={false}
          />
        </span>
        <span className="flip-face flip-back">
          <span>The phrase stays on the paper.</span>
        </span>
      </span>
    </span>
  );
}
