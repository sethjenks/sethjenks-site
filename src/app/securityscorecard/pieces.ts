export const securityScorecardPieces = [
  {
    id: "questionnaires",
    title: "Questionnaires",
    line: "A rebuild of the Questionnaires product, starting from the Figma files.",
  },
  {
    id: "assessments",
    title: "Assessments",
    line: "A rebuild of the Assessments product, starting from the Figma files.",
  },
  {
    id: "ai",
    title: "AI",
    line: "A rebuild of the AI product, including the prototypes, starting from the Figma files.",
  },
] as const;

export type SecurityScorecardPiece = (typeof securityScorecardPieces)[number];

export function securityScorecardPiece(
  id: SecurityScorecardPiece["id"],
): SecurityScorecardPiece {
  const piece = securityScorecardPieces.find((item) => item.id === id);

  if (!piece) {
    throw new Error(`Unknown SecurityScorecard piece "${id}".`);
  }

  return piece;
}
