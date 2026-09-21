import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seth Jenks",
  description:
    "A public daily log of curated agentic work, dated in America/Denver.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
