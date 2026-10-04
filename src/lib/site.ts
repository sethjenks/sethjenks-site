export const ROLE_LINE =
  "I design software and build it in code, so a sketch can ship. I run workshops with teams until we agree on what we're making and why, then write the next steps.";

export const INTRO_COPY =
  "I keep a public journal of the work, dated in America/Denver.";

export const SITE_DESCRIPTION =
  "A public journal of work I design and build, dated in America/Denver.";

export const CONTACTS = [
  { label: "X", href: "https://twitter.com/sethjenks" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sethjenks" },
  { label: "GitHub", href: "https://github.com/sethjenks" },
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
