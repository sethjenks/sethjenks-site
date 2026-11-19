"use client";

import { securityScorecardPieces } from "@/app/securityscorecard/pieces";
import { BentoFrame } from "@/components/bento/card";
import { FanStage } from "@/components/bento/fan";
import { FlipStage } from "@/components/bento/flip";
import { FollowStage } from "@/components/bento/follow";
import { useBentoGesture } from "@/components/bento/gesture";
import { MoveStage } from "@/components/bento/move";
import { OpenStage, PHILO_STOPS, openStop } from "@/components/bento/open";
import { PeekStage } from "@/components/bento/peek";
import { ScrubCard } from "@/components/bento/scrub-card";
import { ShiftStage } from "@/components/bento/shift";
import { MATRIX_QUADS, SpotlightStage, matrixIndex } from "@/components/bento/spotlight";
import { SwapCard } from "@/components/bento/swap-card";
import { TickStage } from "@/components/bento/tick";
import { ToggleStage } from "@/components/bento/toggle";

const REST =
  "Whether rivals can copy your context, and whether the model already knows it.";

export const BENTO_BENCH = [
  {
    id: "move",
    name: "Move",
    sentence: "A chip leaves Offering, lands in Requesting, and the line rewrites.",
    Card: MoveCard,
  },
  {
    id: "toggle",
    name: "Toggle",
    sentence: "The key is on the paper, or it is in the enclave and the phone reads signed.",
    Card: ToggleCard,
  },
  {
    id: "fan",
    name: "Fan",
    sentence: "The ID, badge, and membership start stacked and spread.",
    Card: FanCard,
  },
  {
    id: "swap",
    name: "Swap",
    sentence: "Each hover or tap steps to the next Sage beat.",
    Card: SwapCard,
  },
  {
    id: "spotlight",
    name: "Spotlight",
    sentence: "The pointer lights a quadrant and one sentence appears.",
    Card: SpotlightCard,
  },
  {
    id: "open",
    name: "Open",
    sentence: "The cell opens onto Explore, Build, Companies, or Team.",
    Card: OpenCard,
  },
  {
    id: "flip",
    name: "Flip",
    sentence: "The phone turns over to the sentence on the back.",
    Card: FlipCard,
  },
  {
    id: "follow",
    name: "Follow",
    sentence: "A Philo sticker lifts toward the pointer.",
    Card: FollowCard,
  },
  {
    id: "tick",
    name: "Tick",
    sentence: "One questionnaire row checks itself.",
    Card: TickCard,
  },
  {
    id: "scrub",
    name: "Scrub",
    sentence: "Pointer position picks a frame. A tap steps one frame.",
    Card: ScrubCard,
  },
  {
    id: "peek",
    name: "Peek",
    sentence: "The portrait stays. A sentence appears at the pointer.",
    Card: PeekCard,
  },
  {
    id: "shift",
    name: "Shift",
    sentence: "The phone and the paper move a few pixels apart.",
    Card: ShiftCard,
  },
] as const;

function MoveCard() {
  const gesture = useBentoGesture("moment");
  return (
    <BentoFrame
      id="move"
      surface="paper"
      sentenceId="move-sentence"
      gesture={gesture}
      caption={gesture.active ? "10 XCH for this NFT." : "A proposal, not a payment."}
    >
      <MoveStage gesture={gesture} />
    </BentoFrame>
  );
}

function ToggleCard() {
  const gesture = useBentoGesture("sticky");
  return (
    <BentoFrame
      id="toggle"
      surface="paper"
      sentenceId="toggle-sentence"
      gesture={gesture}
      caption={gesture.active ? "Signed in the enclave." : "The phrase stays on the paper."}
    >
      <ToggleStage gesture={gesture} />
    </BentoFrame>
  );
}

function FanCard() {
  const gesture = useBentoGesture("moment");
  return (
    <BentoFrame
      id="fan"
      surface="ink"
      sentenceId="fan-sentence"
      gesture={gesture}
      caption={gesture.active ? "ID, badge, and membership." : "Verifiable credentials"}
    >
      <FanStage gesture={gesture} />
    </BentoFrame>
  );
}

function SpotlightCard() {
  const gesture = useBentoGesture("sticky");
  const lit = gesture.reduced
    ? -1
    : gesture.hover
      ? matrixIndex(gesture.point)
      : gesture.latched
        ? matrixIndex(gesture.pin)
        : -1;
  const quad = MATRIX_QUADS[lit];

  return (
    <BentoFrame
      id="spotlight"
      surface="ink"
      sentenceId="spotlight-sentence"
      gesture={gesture}
      caption={quad ? quad.line : REST}
    >
      <SpotlightStage gesture={gesture} />
    </BentoFrame>
  );
}

function OpenCard() {
  const gesture = useBentoGesture("moment");
  const stop = openStop(gesture);
  const frame = PHILO_STOPS[stop] ?? PHILO_STOPS[0];

  return (
    <BentoFrame
      id="open"
      surface="photo"
      sentenceId="open-sentence"
      gesture={gesture}
      caption={gesture.active ? frame.label : "Philo"}
    >
      <OpenStage gesture={gesture} />
    </BentoFrame>
  );
}

function FlipCard() {
  const gesture = useBentoGesture("moment");
  return (
    <BentoFrame
      id="flip"
      surface="photo"
      sentenceId="flip-sentence"
      gesture={gesture}
      caption={gesture.active ? "The phrase stays on the paper." : "Transaction Signer"}
    >
      <FlipStage gesture={gesture} />
    </BentoFrame>
  );
}

function FollowCard() {
  const gesture = useBentoGesture("moment");
  return (
    <BentoFrame
      id="follow"
      surface="photo"
      sentenceId="follow-sentence"
      gesture={gesture}
      caption="Stickers"
    >
      <FollowStage gesture={gesture} />
    </BentoFrame>
  );
}

function TickCard() {
  const gesture = useBentoGesture("moment");
  const piece = securityScorecardPieces[0];

  return (
    <BentoFrame
      id="tick"
      surface="paper"
      sentenceId="tick-sentence"
      gesture={gesture}
      caption={piece.line}
    >
      <TickStage gesture={gesture} />
    </BentoFrame>
  );
}

function PeekCard() {
  const gesture = useBentoGesture("moment");
  return (
    <BentoFrame
      id="peek"
      surface="paper"
      sentenceId="peek-sentence"
      gesture={gesture}
      caption="Ingrid Cruz"
    >
      <PeekStage gesture={gesture} />
    </BentoFrame>
  );
}

function ShiftCard() {
  const gesture = useBentoGesture("moment");
  return (
    <BentoFrame
      id="shift"
      surface="paper"
      sentenceId="shift-sentence"
      gesture={gesture}
      caption={gesture.active ? "The phone leaves the paper." : "Keys off the paper."}
    >
      <ShiftStage gesture={gesture} />
    </BentoFrame>
  );
}
