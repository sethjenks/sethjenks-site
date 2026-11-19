import type { Metadata } from "next";
import Link from "next/link";
import { BentoBench } from "@/components/bento/bench";

export const metadata: Metadata = {
  title: "Bento",
};

export default function BentoLabPage() {
  return (
    <main className="lab-page bento-lab">
      <h1>Bento</h1>
      <p className="lab-lede">
        Hover a card, or tap it. Each one does a single thing, then settles. They stay on this bench until one is ready for the site.
      </p>
      <p className="bento-lab-back">
        <Link href="/lab">Lab</Link>
      </p>
      <BentoBench />
    </main>
  );
}
