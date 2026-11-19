"use client";

import Image from "next/image";
import type { BentoGesture } from "@/components/bento/gesture";

export function followOffset(gesture: BentoGesture) {
  if (gesture.reduced) {
    return { x: 0, y: 0 };
  }

  const point = gesture.hover ? gesture.point : gesture.latched ? gesture.pin : { x: 0.5, y: 0.5 };
  return {
    x: (point.x - 0.5) * 72,
    y: (point.y - 0.5) * 56,
  };
}

export function FollowStage({ gesture }: { gesture: BentoGesture }) {
  const offset = followOffset(gesture);

  return (
    <div className="follow-board">
      <Image
        src="/media/work/philo-stickers.jpg"
        alt=""
        fill
        sizes="(min-width: 800px) 40rem, 100vw"
        draggable={false}
      />
      <span className="follow-sticker" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}
