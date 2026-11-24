import { serveSource } from "@/lib/link-previews/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return serveSource(request);
}
