import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Feed } from "@/components/feed";
import { formatDayHeading, getEntryDayGroups } from "@/lib/entries";
import { shareImage } from "@/lib/link-previews/share-image";

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
    return { title: "Journal" };
  }

  const title = formatDayHeading(date);
  const description = `Notes from ${title}.`;
  const image = shareImage("/journal");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image
        ? { images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] }
        : {}),
    },
  };
}

export default async function JournalDayPage({
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
    <main id="journal" className="log-main">
      <Feed groups={[group]} stamp="h1" />
    </main>
  );
}
