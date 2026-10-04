import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        <Script src="/soft-matter/runtime.d631aa3ec6122788.js" strategy="beforeInteractive" />
        <Script src="/soft-matter/effect.b9030f95b969b94d.js" strategy="beforeInteractive" />
        <Script src="/soft-matter/head-skin.js?v=4" strategy="beforeInteractive" />
        <Script src="/soft-matter/header-boot.js?v=play19" strategy="beforeInteractive" />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
