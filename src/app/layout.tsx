import type { Metadata } from "next";
import { Source_Serif_4, Special_Elite } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const specialElite = Special_Elite({
  weight: "400",
  variable: "--font-special-elite",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seth Jenks",
  description:
    "A public daily log of curated agentic work, dated in America/Denver.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${specialElite.variable} h-full`}
    >
      <body className="paper-fiber flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
