"use client";

import type { BentoGesture } from "@/components/bento/gesture";
import { SeekFilm } from "@/components/bento/seek-film";

export const PHILO_STOPS = [
  { label: "Explore", at: 0.08 },
  { label: "Build", at: 0.32 },
  { label: "Companies", at: 0.58 },
  { label: "Team", at: 0.82 },
] as const;

export function openStop(gesture: BentoGesture) {
  if (!gesture.active) {
    return 0;
  }

  const point = gesture.hover ? gesture.point : gesture.pin;
  return Math.min(PHILO_STOPS.length - 1, Math.floor(point.x * PHILO_STOPS.length));
}

export function OpenStage({ gesture }: { gesture: BentoGesture }) {
  const stop = openStop(gesture);
  const frame = PHILO_STOPS[stop] ?? PHILO_STOPS[0];

  return (
    <div className="open-board" data-open={gesture.active ? "" : undefined}>
      <SeekFilm
        src="/media/work/philo.mp4"
        poster="/media/work/philo-poster.jpg"
        ratio={frame.at}
        showFilm={gesture.active}
      />
      <div className="open-stops">
        {PHILO_STOPS.map((item, index) => (
          <span key={item.label} data-current={gesture.active && index === stop ? "" : undefined}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
