import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getWorkItems } from "@/lib/work";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const work = await getWorkItems();

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/log`, changeFrequency: "weekly", priority: 0.8 },
    ...work.map((item) => ({
      url: `${base}/work/${item.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
