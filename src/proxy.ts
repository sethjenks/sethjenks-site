import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { POSTHOG_PROXY_PATH } from "@/lib/posthog-config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leave PostHog paths alone so /ingest/e/ is rewritten, not redirected.
  if (pathname === POSTHOG_PROXY_PATH || pathname.startsWith(`${POSTHOG_PROXY_PATH}/`)) {
    return NextResponse.next();
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    // Use a plain URL. NextURL remembers that this request had a trailing
    // slash and would put it back on the Location header.
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname !== "/journal") {
    return NextResponse.next();
  }

  const filter = request.nextUrl.searchParams.get("tag")?.trim().toLowerCase() ?? "";
  if (!filter) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/journal/tag/${encodeURIComponent(filter)}`;
  url.searchParams.delete("tag");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!ingest(?:/|$)|_next/static|_next/image|.*\\..*).*)"],
};
