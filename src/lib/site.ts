export const ROLE_LINE =
  "Designer. I design software and build it in code.";

export const INTRO_COPY =
  "I keep a public log of the work, dated in America/Denver. New notes show up when there is something worth reading.";

export const SITE_DESCRIPTION =
  "A public log of work I design and build, dated in America/Denver.";

export const CONTACTS = [
  { label: "X", href: "https://twitter.com/sethjenks" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sethjenks" },
] as const;

/**
 * Absolute origin for sitemap and social URLs.
 * sethjenks.com stays unset until that host is live.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && production) {
    return `https://${production.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "http://127.0.0.1:43127";
}
