"use client";

import type { CSSProperties } from "react";
import { SeekFilm } from "@/components/bento/seek-film";

export function ScrubStage({ ratio, showFilm }: { ratio: number; showFilm: boolean }) {
  return (
    <div className="scrub-board" style={{ "--scrub": String(ratio) } as CSSProperties}>
      <SeekFilm
        src="/media/work/philo-headshots.mp4"
        poster="/media/work/philo-headshots-poster.jpg"
        ratio={ratio}
        showFilm={showFilm}
      />
      <span className="scrub-track" aria-hidden="true">
        <span className="scrub-fill" />
      </span>
    </div>
  );
}
