import type { Metadata } from "next";
import { DraftPiece } from "../draft-piece";
import { securityScorecardPiece } from "../pieces";

const piece = securityScorecardPiece("assessments");

export const metadata: Metadata = {
  title: piece.title,
};

export default function AssessmentsPage() {
  return <DraftPiece piece={piece} />;
}
