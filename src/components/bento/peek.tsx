"use client";

import Image from "next/image";
import testimonials from "../../../content/testimonials.json";
import type { BentoGesture } from "@/components/bento/gesture";

const ingrid = testimonials.find((item) => item.id === "ingrid-cruz");

if (!ingrid?.portrait) {
  throw new Error("The Ingrid Cruz testimonial needs a portrait.");
}

const PEEK_QUOTE = firstSentence(ingrid.quote);
const PEEK_PORTRAIT = ingrid.portrait;

function firstSentence(quote: string) {
  const end = quote.indexOf(".");
  return end === -1 ? quote : quote.slice(0, end + 1);
}

export function peekPlace(gesture: BentoGesture) {
  const point = gesture.hover ? gesture.point : gesture.pin;
  return {
    x: Math.min(68, Math.max(8, point.x * 100 - 12)),
    y: Math.min(58, Math.max(10, point.y * 100 - 18)),
  };
}

export function PeekStage({ gesture }: { gesture: BentoGesture }) {
  const place = peekPlace(gesture);

  return (
    <div className="peek-board">
      <Image
        src={PEEK_PORTRAIT}
        alt=""
        fill
        sizes="(min-width: 800px) 40rem, 100vw"
        draggable={false}
      />
      <span
        className="peek-chip"
        data-shown={gesture.active ? "" : undefined}
        style={{ left: `${place.x}%`, top: `${place.y}%` }}
      >
        {PEEK_QUOTE}
      </span>
    </div>
  );
}
