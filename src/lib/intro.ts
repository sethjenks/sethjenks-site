import introFile from "../../content/intro.json";

export type IntroCopy = {
  name: string;
  role: string;
  paragraphs: readonly string[];
  links: Readonly<Record<string, string>>;
  description: string;
};

export const INTRO = parseIntro(introFile);

function parseIntro(value: unknown): IntroCopy {
  if (!isRecord(value)) {
    throw new Error("content/intro.json must be an object.");
  }

  const name = readLine(value.name, "name");
  const role = readLine(value.role, "role");
  const paragraphs = readParagraphs(value.paragraphs);
  const links = readLinks(value.links);
  const description = [role, paragraphs[0]].filter(Boolean).join(" ");

  return { name, role, paragraphs, links, description };
}

function readLine(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`content/intro.json ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("content/intro.json paragraphs must be an array of strings.");
  }

  return value.map((item, index) => readLine(item, `paragraphs[${index}]`));
}

function readLinks(value: unknown): Record<string, string> {
  if (value == null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error("content/intro.json links must be an object of word to URL.");
  }

  const links: Record<string, string> = {};
  for (const [word, href] of Object.entries(value)) {
    if (word.trim().length === 0 || /\s/.test(word)) {
      throw new Error(`content/intro.json links key "${word}" must be a single word.`);
    }
    if (typeof href !== "string" || !/^https?:\/\//.test(href)) {
      throw new Error(`content/intro.json links.${word} must be an http(s) URL.`);
    }
    links[word] = href;
  }

  return links;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
