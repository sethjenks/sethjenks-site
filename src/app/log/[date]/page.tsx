import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Feed } from "@/components/feed";
import { formatDayHeading, getEntryDayGroups } from "@/lib/entries";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function generateStaticParams() {
  const groups = await getEntryDayGroups();
  return groups.map((group) => ({ date: group.date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;

  if (!DATE_PATTERN.test(date)) {
    return { title: "Log" };
  }

  return {
    title: formatDayHeading(date),
    description: `Notes from ${formatDayHeading(date)}.`,
  };
}

export default async function LogDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  if (!DATE_PATTERN.test(date)) {
    notFound();
  }

  const groups = await getEntryDayGroups();
  const group = groups.find((item) => item.date === date);

  if (!group) {
    notFound();
  }

  return (
    <main id="log" className="log-main">
      <Feed groups={[group]} />
    </main>
  );
}
