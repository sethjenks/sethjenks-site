import { readFile } from "node:fs/promises";
import path from "node:path";

const TESTIMONIALS_PATH = path.join(process.cwd(), "content", "testimonials.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  context?: string;
  href?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isTestimonial(value: unknown): value is Testimonial {
  if (!isRecord(value)) {
    return false;
  }

  const { id, quote, author, role, context, href } = value;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return false;
  }

  if (typeof quote !== "string" || quote.trim().length === 0) {
    return false;
  }

  if (typeof author !== "string" || author.trim().length === 0) {
    return false;
  }

  if (typeof role !== "string" || role.trim().length === 0) {
    return false;
  }

  if (context !== undefined && (typeof context !== "string" || context.trim().length === 0)) {
    return false;
  }

  if (href !== undefined && (typeof href !== "string" || !isHttpUrl(href.trim()))) {
    return false;
  }

  return true;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const raw = JSON.parse(await readFile(TESTIMONIALS_PATH, "utf8")) as unknown;

  if (!Array.isArray(raw) || !raw.every(isTestimonial)) {
    throw new Error("content/testimonials.json must be an array of testimonials.");
  }

  const items = raw.map((item) => ({
    id: item.id,
    quote: item.quote.trim(),
    author: item.author.trim(),
    role: item.role.trim(),
    ...(item.context ? { context: item.context.trim() } : {}),
    ...(item.href ? { href: item.href.trim() } : {}),
  }));
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate testimonial id "${item.id}".`);
    }

    seenIds.add(item.id);
  }

  return items;
}
