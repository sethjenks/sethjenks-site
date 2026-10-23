import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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
  matcher: "/journal",
};
