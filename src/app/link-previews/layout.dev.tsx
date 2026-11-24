import type { ReactNode } from "react";
import type { Metadata } from "next";
import { timelessSans } from "@/lib/timeless-sans";

export const metadata: Metadata = {
  title: { absolute: "Link Previews" },
  robots: { index: false, follow: false },
};

export default function LinkPreviewsLayout({ children }: { children: ReactNode }) {
  return <div className={timelessSans.className}>{children}</div>;
}
