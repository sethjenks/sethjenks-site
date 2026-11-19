"use client";

import { SeekFilm } from "@/components/bento/seek-film";

export const SAGE_BEATS = [
  { label: "Product page", at: 0.06 },
  { label: "Character banner", at: 0.42 },
  { label: "Green eye", at: 0.78 },
] as const;

export function SwapStage({ beat }: { beat: number }) {
  const frame = SAGE_BEATS[beat] ?? SAGE_BEATS[0];

  return (
    <SeekFilm
      src="/media/work/sage.mp4"
      poster="/media/work/sage-poster.jpg"
      ratio={frame.at}
      showFilm={beat > 0}
    />
  );
}
