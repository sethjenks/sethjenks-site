"use client";

import Image from "next/image";
import type { BentoGesture } from "@/components/bento/gesture";

export function ShiftStage({ gesture }: { gesture: BentoGesture }) {
  return (
    <div className="shift-board" data-apart={gesture.active ? "" : undefined}>
      <div className="shift-paper" aria-hidden="true">
        <span>On paper</span>
        <span className="signer-bar" />
        <span className="signer-bar" />
        <span className="signer-bar signer-bar-short" />
      </div>
      <div className="shift-phone">
        <Image
          src="/media/work/chia-signer-hero.jpg"
          alt=""
          fill
          sizes="(min-width: 800px) 24rem, 70vw"
          draggable={false}
        />
      </div>
    </div>
  );
}
