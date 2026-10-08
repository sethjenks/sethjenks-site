import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { geistPixelSquare } from "@/lib/pixel-font";
import { timelessSans } from "@/lib/timeless-sans";
import { INTRO } from "@/lib/intro";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Seth Jenks",
    template: "%s · Seth Jenks",
  },
  description: INTRO.description,
  openGraph: {
    title: "Seth Jenks",
    description: INTRO.description,
    siteName: "Seth Jenks",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seth Jenks",
    description: INTRO.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${timelessSans.variable} ${GeistSans.variable} ${GeistMono.variable} ${geistPixelSquare.variable} h-full antialiased`}
      // The boot script sets data-play-enter before paint. React does not render it.
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.playEnter="";setTimeout(function(){document.documentElement.removeAttribute("data-play-enter");var nodes=document.querySelectorAll(".intro-name,.role-line,.intro-copy");for(var i=0;i<nodes.length;i++){if(getComputedStyle(nodes[i]).opacity==="0"){nodes[i].style.opacity="1";nodes[i].style.transform="none"}}var button=document.querySelector("[data-play-button]");if(button&&!button.hasAttribute("data-journal-settled")){button.setAttribute("data-journal-settled","");button.inert=false}},3200)}}catch(e){}',
          }}
        />
        <Script src="/soft-matter/runtime.d631aa3ec6122788.js" strategy="beforeInteractive" />
        <Script src="/soft-matter/effect.b9030f95b969b94d.js" strategy="beforeInteractive" />
        <Script src="/soft-matter/head-skin.js?v=4" strategy="beforeInteractive" />
        <Script src="/soft-matter/header-boot.js?v=play23" strategy="beforeInteractive" />
      </head>
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground">
        <SiteHeader />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
