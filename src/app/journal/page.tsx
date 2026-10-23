import type { Metadata } from "next";
import { Feed } from "@/components/feed";
import { getEntryDayGroups } from "@/lib/entries";

export const metadata: Metadata = {
  title: "Journal",
  description: "Notes from the work, dated in America/Denver.",
};

export default async function JournalPage() {
  const groups = await getEntryDayGroups();

  return (
    <main id="journal" className="log-main">
      <Feed groups={groups} />
    </main>
  );
}
