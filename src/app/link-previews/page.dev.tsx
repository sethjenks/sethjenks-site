import { loadToolData } from "@/lib/link-previews/server";
import { LinkPreviewsTool } from "@/lib/link-previews/tool";

export const dynamic = "force-dynamic";

export default async function LinkPreviewsPage() {
  const data = await loadToolData();
  return <LinkPreviewsTool data={data} />;
}
