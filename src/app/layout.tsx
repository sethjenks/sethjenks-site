import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { EscapeHome } from "@/components/escape-home";
import { MotionRoot } from "@/components/motion-root";
import { PortfolioEnter } from "@/components/portfolio-enter";
import { SiteChrome } from "@/components/site-chrome";
import { getQuietPaths } from "@/lib/work";
import { geistPixelSquare } from "@/lib/pixel-font";
import { timelessSans } from "@/lib/timeless-sans";
import { INTRO } from "@/lib/intro";
import { shareImage, shareVideo } from "@/lib/link-previews/share-image";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";
import "./home-board.css";
import "@/components/board/board.css";

// Next.js 16 resolves metadataBase for og:image, not og:video.
// A relative video path is emitted unchanged, so crawlers need this absolute URL.
const spacebaseVideoUrl = "https://www.sethjenks.com/media/work/spacebase.mp4";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light",
  themeColor: "oklch(98.5% 0 none)",
};

export async function generateMetadata(): Promise<Metadata> {
  const image = shareImage("/");
  const video = shareVideo("/");
  const shareVideoTags = video
    ? [{ url: video.url, type: video.type, width: video.width, height: video.height }]
    : [
        {
          url: spacebaseVideoUrl,
          secureUrl: spacebaseVideoUrl,
          type: "video/mp4" as const,
          width: 1024,
          height: 1024,
        },
      ];

  return {
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
      ...(image ? { images: [image] } : {}),
      videos: shareVideoTags,
    },
    twitter: {
      card: "summary_large_image",
      title: "Seth Jenks",
      description: INTRO.description,
      ...(image
        ? { images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] }
        : {}),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const quietPaths = await getQuietPaths();

  return (
    <html
      lang="en"
      className={`${timelessSans.variable} ${GeistSans.variable} ${GeistMono.variable} ${geistPixelSquare.variable} h-full antialiased`}
      // The boot script sets data-play-enter before paint. React does not render it.
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.playEnter="";setTimeout(function(){document.documentElement.removeAttribute("data-play-enter");var nodes=document.querySelectorAll(".intro-name,.role-line,.intro-copy");for(var i=0;i<nodes.length;i++){if(getComputedStyle(nodes[i]).opacity==="0"){nodes[i].style.opacity="1";nodes[i].style.transform="none"}}var button=document.querySelector("[data-play-button]");if(button&&!button.hasAttribute("data-journal-settled")){button.setAttribute("data-journal-settled","");button.inert=false}},3200)}}catch(e){}',
          }}
        />
        <Script src="/soft-matter/runtime.d631aa3ec6122788.js" strategy="beforeInteractive" />
        <Script src="/soft-matter/effect.b9030f95b969b94d.js" strategy="beforeInteractive" />
        <Script src="/soft-matter/head-skin.js?v=4" strategy="beforeInteractive" />
        <Script src="/soft-matter/header-boot.js?v=play24" strategy="beforeInteractive" />
      </head>
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground">
        <EscapeHome />
        <MotionRoot>
          <PortfolioEnter>
            <SiteChrome quietPaths={quietPaths}>{children}</SiteChrome>
          </PortfolioEnter>
        </MotionRoot>
      </body>
    </html>
  );
}
