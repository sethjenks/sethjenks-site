import type { Metadata } from "next";
import { DraftPiece } from "../draft-piece";
import { securityScorecardPiece } from "../pieces";

const piece = securityScorecardPiece("questionnaires");

export const metadata: Metadata = {
  title: piece.title,
};

export default function QuestionnairesPage() {
  return <DraftPiece piece={piece} />;
}
