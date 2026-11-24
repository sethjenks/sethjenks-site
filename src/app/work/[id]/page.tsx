import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkStudy } from "@/components/work-study";
import { shareImage, shareVideo } from "@/lib/link-previews/share-image";
import { getRelatedWork, getWorkItem, getWorkItems } from "@/lib/work";

export async function generateStaticParams() {
  const items = await getWorkItems();
  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getWorkItem(id);

  if (!item) {
    return { title: "Work" };
  }

  const image = shareImage(`/work/${item.id}`);
  const video = shareVideo(`/work/${item.id}`);

  return {
    title: item.title,
    description: item.summary,
    openGraph: {
      title: item.title,
      description: item.summary,
      type: "article",
      ...(image ? { images: [image] } : {}),
      ...(video
        ? { videos: [{ url: video.url, type: video.type, width: video.width, height: video.height }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.summary,
      ...(image
        ? { images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] }
        : {}),
    },
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getWorkItem(id);

  if (!item) {
    notFound();
  }

  const related = await getRelatedWork(item.id);

  return <WorkStudy item={item} related={related} />;
}
