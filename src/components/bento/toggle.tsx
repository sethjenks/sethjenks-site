"use client";

import type { BentoGesture } from "@/components/bento/gesture";

export function ToggleStage({ gesture }: { gesture: BentoGesture }) {
  return (
    <div className="signer-board" data-signed={gesture.active ? "" : undefined}>
      <div className="signer-paper" aria-hidden="true">
        <span className="signer-kicker">On paper</span>
        <span className="signer-bar" />
        <span className="signer-bar" />
        <span className="signer-bar signer-bar-short" />
      </div>
      <div className="signer-phone" aria-hidden="true">
        <span className="signer-kicker">Phone</span>
        <strong>{gesture.active ? "Signed" : "Sign"}</strong>
      </div>
      <div className="signer-enclave">
        <span>Enclave</span>
      </div>
      <span className="signer-key">Key</span>
    </div>
  );
}
