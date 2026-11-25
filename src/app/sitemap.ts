import type { MetadataRoute } from "next";
import { getEntryDayGroups } from "@/lib/entries";
import { getSiteUrl } from "@/lib/site";
import { getWorkItems } from "@/lib/work";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [work, days] = await Promise.all([getWorkItems(), getEntryDayGroups()]);

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/journal`, changeFrequency: "weekly", priority: 0.8 },
    ...days.map((day) => ({
      url: `${base}/journal/${day.date}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...work.map((item) => ({
      url: `${base}/work/${item.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
