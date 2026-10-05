import localFont from "next/font/local";

/**
 * Timeless Sans variable font (wght 300–800, ital, STYL).
 * Default cut is Grotesk (STYL 0). The Sans cut is STYL 100.
 * Named Regular sits at 420, not 400.
 */
export const timelessSans = localFont({
  src: "../fonts/TimelessSansVF.woff2",
  variable: "--font-timeless-sans",
  weight: "300 800",
  display: "swap",
  adjustFontFallback: false,
});
