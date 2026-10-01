import { readFile } from "node:fs/promises";
import path from "node:path";

const PROJECTS_PATH = path.join(process.cwd(), "content", "projects.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProjectItem = {
  id: string;
  title: string;
  line?: string;
  href?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProjectItem(value: unknown): value is ProjectItem {
  if (!isRecord(value)) {
    return false;
  }

  const { id, title, line, href } = value;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return false;
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return false;
  }

  if (line !== undefined && (typeof line !== "string" || line.trim().length === 0)) {
    return false;
  }

  if (href !== undefined && (typeof href !== "string" || href.trim().length === 0)) {
    return false;
  }

  return true;
}

export async function getProjectItems(): Promise<ProjectItem[]> {
  const raw = JSON.parse(await readFile(PROJECTS_PATH, "utf8")) as unknown;

  if (!Array.isArray(raw) || !raw.every(isProjectItem)) {
    throw new Error("content/projects.json must be an array of project items.");
  }

  const items = raw.map((item) => ({
    id: item.id,
    title: item.title.trim(),
    ...(item.line ? { line: item.line.trim() } : {}),
    ...(item.href ? { href: item.href.trim() } : {}),
  }));
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate project id "${item.id}".`);
    }

    seenIds.add(item.id);
  }

  return items;
}
