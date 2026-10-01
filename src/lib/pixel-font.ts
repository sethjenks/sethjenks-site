import localFont from "next/font/local";

/**
 * Load only Geist Pixel Square.
 * The package barrel also calls next/font for Grid, Line, Circle, and Triangle,
 * which preloads faces this site does not use.
 */
export const geistPixelSquare = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2",
  variable: "--font-geist-pixel-square",
  weight: "500",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "monospace"],
});
