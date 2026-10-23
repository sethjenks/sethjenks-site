import Link from "next/link";
import type { SecurityScorecardPiece } from "./pieces";

export function DraftPiece({ piece }: { piece: SecurityScorecardPiece }) {
  return (
    <main className="draft-page">
      <nav className="draft-crumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/securityscorecard">SecurityScorecard</Link>
          </li>
          <li aria-current="page">{piece.title}</li>
        </ol>
      </nav>
      <h1>{piece.title}</h1>
      <p className="draft-lede">{piece.line}</p>
      <section className="draft-stage" aria-label="Stage">
        <p>Figma rebuild goes here.</p>
      </section>
    </main>
  );
}
