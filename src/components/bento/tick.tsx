"use client";

import { securityScorecardPieces } from "@/app/securityscorecard/pieces";
import type { BentoGesture } from "@/components/bento/gesture";

export function TickStage({ gesture }: { gesture: BentoGesture }) {
  return (
    <ul className="tick-list">
      {securityScorecardPieces.map((piece, index) => {
        const checked = index === 0 && gesture.active;
        return (
          <li key={piece.id} data-checked={checked ? "" : undefined}>
            <span className="tick-box" aria-hidden="true" />
            <span>{piece.title}</span>
          </li>
        );
      })}
    </ul>
  );
}
