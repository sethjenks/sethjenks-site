export const CONTACTS = [
  { label: "X", href: "https://twitter.com/sethjenks" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sethjenks" },
  { label: "GitHub", href: "https://github.com/sethjenks" },
  { label: "on.design", href: "https://on.design/seth" },
] as const;

/**
 * Sidebar contact links. EMAIL and RESUME_URL stay empty until Seth fills
 * them in. Empty values are not rendered. Contact is X and LinkedIn.
 */
export const PROFILE_LINKS = {
  LINKEDIN_URL: "https://www.linkedin.com/in/sethjenks",
  X_URL: "https://x.com/sethjenks",
  EMAIL: "",
  RESUME_URL: "",
} as const;

export type ProfileLink = {
  id: "email" | "linkedin" | "x" | "resume";
  label: string;
  href: string;
};

export function profileLinks(config: typeof PROFILE_LINKS = PROFILE_LINKS): ProfileLink[] {
  const links: ProfileLink[] = [];
  const email = config.EMAIL.trim();
  const linkedin = config.LINKEDIN_URL.trim();
  const x = config.X_URL.trim();
  const resume = config.RESUME_URL.trim();

  if (email) {
    links.push({ id: "email", label: "Email", href: `mailto:${email}` });
  }
  if (linkedin) {
    links.push({ id: "linkedin", label: "LinkedIn", href: linkedin });
  }
  if (x) {
    links.push({ id: "x", label: "X", href: x });
  }
  if (resume) {
    links.push({ id: "resume", label: "Resume", href: resume });
  }

  return links;
}

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
