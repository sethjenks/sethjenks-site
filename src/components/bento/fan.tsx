"use client";

import type { BentoGesture } from "@/components/bento/gesture";

const CARDS = [
  { id: "id", name: "Government ID", tone: "id" },
  { id: "badge", name: "Badging", tone: "slate" },
  { id: "member", name: "Memberships", tone: "slate" },
] as const;

export function FanStage({ gesture }: { gesture: BentoGesture }) {
  return (
    <div className="fan-board" data-open={gesture.active ? "" : undefined}>
      {CARDS.map((card) => (
        <div key={card.id} className="fan-card" data-tone={card.tone}>
          <span>{card.name}</span>
        </div>
      ))}
    </div>
  );
}
