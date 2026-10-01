import { ogSize, renderWorkCard } from "@/lib/og-card";
import { getWorkItem } from "@/lib/work";

export const alt = "Case study by Seth Jenks";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getWorkItem(id);

  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  return renderWorkCard(item);
}
