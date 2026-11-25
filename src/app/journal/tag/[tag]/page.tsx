import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Feed } from "@/components/feed";
import { shareImage } from "@/lib/link-previews/share-image";
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

  const title = filter || "Journal";
  const description = filter
    ? `Notes tagged ${filter}.`
    : "Notes from the work, dated in America/Denver.";
  const image = shareImage("/journal");

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
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
      <h1 className="sr-only">{filter}</h1>
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
