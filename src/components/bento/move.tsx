"use client";

import type { BentoGesture } from "@/components/bento/gesture";

export function MoveStage({ gesture }: { gesture: BentoGesture }) {
  return (
    <div className="offer-board" data-sent={gesture.active ? "" : undefined}>
      <div className="offer-col">
        <span className="offer-kicker">Offering</span>
        <span className="offer-chip">10 XCH</span>
        <span className="offer-chip offer-stay">Token</span>
      </div>
      <div className="offer-col">
        <span className="offer-kicker">Requesting</span>
      </div>
      <span className="offer-chip offer-nft">NFT</span>
    </div>
  );
}
