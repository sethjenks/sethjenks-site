import type { Metadata } from "next";
import Link from "next/link";
import { securityScorecardPieces } from "./pieces";

export const metadata: Metadata = {
  title: "SecurityScorecard",
};

export default function SecurityScorecardPage() {
  return (
    <main className="draft-page">
      <h1>SecurityScorecard</h1>
      <p className="draft-lede">
        Three product rebuilds, starting from the Figma files.
      </p>
      <ul className="draft-list">
        {securityScorecardPieces.map((piece) => (
          <li key={piece.id}>
            <Link href={`/securityscorecard/${piece.id}`}>
              <span className="draft-name">{piece.title}</span>
              <span className="draft-line">{piece.line}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
