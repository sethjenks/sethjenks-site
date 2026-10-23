import type { Metadata } from "next";
import { DraftPiece } from "../draft-piece";
import { securityScorecardPiece } from "../pieces";

const piece = securityScorecardPiece("ai");

export const metadata: Metadata = {
  title: piece.title,
};

export default function AiPage() {
  return <DraftPiece piece={piece} />;
}
