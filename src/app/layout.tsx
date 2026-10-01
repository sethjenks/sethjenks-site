import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { geistPixelSquare } from "@/lib/pixel-font";
import { getSiteUrl, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Seth Jenks",
    template: "%s · Seth Jenks",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Seth Jenks",
    description: SITE_DESCRIPTION,
    siteName: "Seth Jenks",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seth Jenks",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} ${geistPixelSquare.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
