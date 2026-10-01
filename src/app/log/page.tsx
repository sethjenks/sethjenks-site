import type { Metadata } from "next";
import { Feed } from "@/components/feed";
import { getEntryDayGroups, normalizeTag } from "@/lib/entries";

export const metadata: Metadata = {
  title: "Log",
  description: "Notes from the work, dated in America/Denver.",
};

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const groups = await getEntryDayGroups();
  const filter = tag ? normalizeTag(tag) : "";
  const filtered = filter
    ? groups
        .map((group) => ({
          ...group,
          entries: group.entries.filter((entry) =>
            entry.tags?.some((item) => normalizeTag(item) === filter),
          ),
        }))
        .filter((group) => group.entries.length > 0)
    : groups;

  return (
    <main id="log" className="log-main">
      <Feed
        groups={filtered}
        empty={
          filter ? `No notes tagged ${filter}.` : "No notes in the log yet."
        }
      />
    </main>
  );
}
