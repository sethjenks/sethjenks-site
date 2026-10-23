import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Feed } from "@/components/feed";
import {
  filterDayGroupsByTag,
  getEntryDayGroups,
  getJournalTags,
  normalizeTag,
} from "@/lib/entries";

export async function generateStaticParams() {
  const tags = await getJournalTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const filter = normalizeTag(safeTag(tag));

  return {
    title: filter || "Journal",
    description: filter
      ? `Notes tagged ${filter}.`
      : "Notes from the work, dated in America/Denver.",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function JournalTagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = safeTag(tag);
  const filter = normalizeTag(decoded);

  if (!filter) {
    notFound();
  }

  if (filter !== decoded) {
    redirect(`/journal/tag/${encodeURIComponent(filter)}`);
  }

  const groups = filterDayGroupsByTag(await getEntryDayGroups(), filter);

  return (
    <main id="journal" className="log-main">
      <Feed
        groups={groups}
        empty={{
          title: "No notes with that tag.",
          body: `Nothing is tagged ${filter}.`,
          action: { href: "/journal", label: "All notes" },
        }}
      />
    </main>
  );
}

function safeTag(tag: string): string {
  try {
    return decodeURIComponent(tag);
  } catch {
    return "";
  }
}
