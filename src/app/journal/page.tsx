import type { Metadata } from "next";
import { Feed } from "@/components/feed";
import { getEntryDayGroups } from "@/lib/entries";
import { shareImage, shareVideo } from "@/lib/link-previews/share-image";

const description = "Notes from the work, dated in America/Denver.";

export async function generateMetadata(): Promise<Metadata> {
  const image = shareImage("/journal");
  const video = shareVideo("/journal");

  return {
    title: "Journal",
    description,
    openGraph: {
      title: "Journal",
      description,
      ...(image ? { images: [image] } : {}),
      ...(video
        ? { videos: [{ url: video.url, type: video.type, width: video.width, height: video.height }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: "Journal",
      description,
      ...(image
        ? { images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] }
        : {}),
    },
  };
}

export default async function JournalPage() {
  const groups = await getEntryDayGroups();

  return (
    <main id="journal" className="log-main">
      <Feed groups={groups} />
    </main>
  );
}
