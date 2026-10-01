import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkStudy } from "@/components/work-study";
import {
  getNextWorkItem,
  getRelatedWork,
  getWorkItem,
  getWorkItems,
} from "@/lib/work";

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

  return {
    title: item.title,
    description: item.summary,
    openGraph: {
      title: item.title,
      description: item.summary,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.summary,
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

  const [related, all] = await Promise.all([
    getRelatedWork(item.id),
    getWorkItems(),
  ]);

  return (
    <WorkStudy
      item={item}
      related={related}
      next={getNextWorkItem(all, item.id)}
    />
  );
}
