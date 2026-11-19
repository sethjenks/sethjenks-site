"use client";

import type { ReactNode } from "react";
import type { BentoGesture } from "@/components/bento/gesture";

type CardSurface = "paper" | "photo" | "ink";

export function BentoFrame({
  id,
  surface,
  sentenceId,
  gesture,
  handlers,
  pressed,
  caption,
  children,
}: {
  id: string;
  surface: CardSurface;
  sentenceId: string;
  gesture: BentoGesture;
  handlers?: Partial<BentoGesture["bind"]>;
  pressed?: boolean;
  caption: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="bento-card"
      data-surprise={id}
      data-surface={surface}
      data-active={gesture.active ? "" : undefined}
      aria-labelledby={`${id}-title`}
      aria-describedby={sentenceId}
      aria-pressed={pressed ?? gesture.latched}
      {...gesture.bind}
      {...handlers}
    >
      <span className="bento-stage">{children}</span>
      <span className="bento-caption">{caption}</span>
    </button>
  );
}
