import type { Metadata } from "next";
import { HomeBoard } from "@/components/home-board";
import { INTRO } from "@/lib/intro";
import { getHomeBoard } from "@/lib/home";
import { shareImage, shareVideo } from "@/lib/link-previews/share-image";

// Kept in sync with root layout: Messages needs an absolute og:video URL.
const spacebaseVideoUrl = "https://www.sethjenks.com/media/work/spacebase.mp4";

export async function generateMetadata(): Promise<Metadata> {
  const image = shareImage("/");
  const video = shareVideo("/");

  return {
    openGraph: {
      title: "Seth Jenks",
      description: INTRO.description,
      ...(image ? { images: [image] } : {}),
      videos: video
        ? [{ url: video.url, type: video.type, width: video.width, height: video.height }]
        : [
            {
              url: spacebaseVideoUrl,
              secureUrl: spacebaseVideoUrl,
              type: "video/mp4",
              width: 1024,
              height: 1024,
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Seth Jenks",
      description: INTRO.description,
      ...(image
        ? { images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] }
        : {}),
    },
  };
}

export default async function Home() {
  const board = await getHomeBoard();

  return (
    <HomeBoard
      board={board}
      name={INTRO.name}
      headline="Design leader who builds."
      bio={INTRO.paragraphs[0] ?? ""}
    />
  );
}
