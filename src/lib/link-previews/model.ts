import { canonical, definitionHash } from "./definition-hash";
import { templateUses } from "./template-names";
import type { Entry, EntryVideo, ImageSource, Manifest, SourceFile, System } from "./types";
import { resolveLayout } from "./types";

export type PageStatus = "missing" | "draft" | "saved" | "stale";

export type Snap = {
  view: string;
  entries: Entry[];
  template: string;
  color: string;
};

export type Step = {
  key: string;
  at: number;
  merge: boolean;
  before: Snap;
  after: Snap;
};

export type FileInfo = { imageBytes: number | null; videoBytes: number | null };

export type ToolData = {
  manifest: Manifest;
  sources: SourceFile[];
  files: Record<string, FileInfo>;
  registryPath: string;
};

export type Model = Snap & {
  past: Step[];
  future: Step[];
  saved: Entry[];
  files: Record<string, FileInfo>;
};

export type ListedPage = {
  path: string;
  entry: Entry;
  stored: boolean;
};

export function sameEntry(a: Entry, b: Entry): boolean {
  return canonical(a) === canonical(b);
}

export function pageStatus(
  draft: Entry | null,
  saved: Entry | undefined,
  fileExists: boolean,
  system: System,
): PageStatus {
  if (!draft && !saved) return "missing";
  const current = draft ?? saved;
  if (!current || !saved || !fileExists || !sameEntry(current, saved)) return "draft";
  if (!saved.savedHash) return resolveLayout(saved) === "image-only" ? "saved" : "stale";
  const hash = definitionHash(current, system, templateUses(system.template).color);
  return hash === saved.savedHash ? "saved" : "stale";
}

export function groupFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return "Pages";
  const folder = parts[0] ?? "Pages";
  return folder.charAt(0).toUpperCase() + folder.slice(1);
}

export function titleFromPath(pathname: string): string {
  if (pathname === "/") return "Home";
  const last = pathname.split("/").filter(Boolean).pop() ?? "Home";
  return last
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function idFromPath(pathname: string, taken: Set<string>): string {
  const base = pathname === "/" ? "home" : pathname.slice(1).replaceAll("/", "-");
  const trimmed = base.slice(0, 64).replace(/-$/g, "") || "page";
  if (!taken.has(trimmed)) return trimmed;
  let n = 2;
  while (taken.has(`${trimmed}-${n}`.slice(0, 64))) n += 1;
  return `${trimmed}-${n}`.slice(0, 64);
}

export function defaultDraft(pathname: string, entries: Entry[]): Entry {
  const taken = new Set(entries.map((entry) => entry.id));
  return {
    id: idFromPath(pathname, taken),
    path: pathname,
    title: titleFromPath(pathname),
    group: groupFromPath(pathname),
    theme: "light",
    image: null,
    layout: "type-only",
    version: null,
    savedHash: null,
  };
}

export function listPages(entries: Entry[], sitemap: string[]): { groups: string[]; pages: ListedPage[] } {
  const known = new Set(entries.map((entry) => entry.path));
  const groups: string[] = [];
  for (const entry of entries) {
    if (!groups.includes(entry.group)) groups.push(entry.group);
  }
  const extras: { path: string; group: string }[] = [];
  for (const pathname of sitemap) {
    if (known.has(pathname)) continue;
    const group = groupFromPath(pathname);
    extras.push({ path: pathname, group });
    if (!groups.includes(group)) groups.push(group);
  }
  const pages: ListedPage[] = [];
  for (const group of groups) {
    for (const entry of entries) {
      if (entry.group === group) pages.push({ path: entry.path, entry, stored: true });
    }
    for (const extra of extras) {
      if (extra.group !== group) continue;
      pages.push({ path: extra.path, entry: defaultDraft(extra.path, entries), stored: false });
    }
  }
  return { groups, pages };
}

export function snapOf(model: Model): Snap {
  return {
    view: model.view,
    entries: model.entries,
    template: model.template,
    color: model.color,
  };
}

export function commit(model: Model, next: Snap, key: string, merge: boolean, at = Date.now()): Model {
  const before = snapOf(model);
  if (canonical(before) === canonical(next)) return model;
  const past = model.past.slice();
  const previous = past.at(-1);
  if (merge && previous && previous.merge && previous.key === key && at - previous.at <= 1000) {
    past[past.length - 1] = { ...previous, at, after: next };
    return { ...model, ...next, past, future: [] };
  }
  past.push({ key, at, merge, before, after: next });
  return { ...model, ...next, past, future: [] };
}

function viewExists(view: string, entries: Entry[], sitemap: string[]): boolean {
  if (view === "all" || view === "template") return true;
  if (entries.some((entry) => entry.path === view)) return true;
  return sitemap.includes(view);
}

export function undo(model: Model, sitemap: string[]): Model {
  const step = model.past.at(-1);
  if (!step) return model;
  const view = viewExists(step.before.view, step.before.entries, sitemap) ? step.before.view : "all";
  return {
    ...model,
    ...step.before,
    view,
    past: model.past.slice(0, -1),
    future: [step, ...model.future],
  };
}

export function redo(model: Model, sitemap: string[]): Model {
  const step = model.future[0];
  if (!step) return model;
  const view = viewExists(step.after.view, step.after.entries, sitemap) ? step.after.view : "all";
  return {
    ...model,
    ...step.after,
    view,
    past: [...model.past, step],
    future: model.future.slice(1),
  };
}

function mapSnaps(steps: Step[], id: string, version: string | null, savedHash: string | null): Step[] {
  const stamp = (entry: Entry) => (entry.id === id ? { ...entry, version, savedHash } : entry);
  return steps.map((step) => ({
    ...step,
    before: { ...step.before, entries: step.before.entries.map(stamp) },
    after: { ...step.after, entries: step.after.entries.map(stamp) },
  }));
}

export function stampSave(model: Model, stored: Entry, bytes: number, concurrent: boolean): Model {
  const version = stored.version;
  const savedHash = stored.savedHash;
  const stamp = (entry: Entry) =>
    entry.id === stored.id ? { ...entry, version: stored.version, savedHash } : entry;
  const entries = model.entries.some((entry) => entry.id === stored.id)
    ? model.entries.map((entry) => (entry.id === stored.id ? (concurrent ? stamp(entry) : stored) : entry))
    : [...model.entries, stored];
  const saved = model.saved.some((entry) => entry.id === stored.id)
    ? model.saved.map((entry) => (entry.id === stored.id ? stored : entry))
    : [...model.saved, stored];
  return {
    ...model,
    entries,
    saved,
    past: mapSnaps(model.past, stored.id, version, savedHash),
    future: mapSnaps(model.future, stored.id, version, savedHash),
    files: {
      ...model.files,
      [stored.id]: {
        imageBytes: bytes,
        videoBytes: model.files[stored.id]?.videoBytes ?? null,
      },
    },
  };
}

function mapVideo(entries: Entry[], id: string, video: EntryVideo | undefined): Entry[] {
  return entries.map((entry) => {
    if (entry.id !== id) return entry;
    if (!video) {
      const next = { ...entry };
      delete next.video;
      return next;
    }
    return { ...entry, video };
  });
}

export function applyVideo(model: Model, id: string, video: EntryVideo | undefined, bytes: number | null): Model {
  const map = (entries: Entry[]) => mapVideo(entries, id, video);
  const mapStep = (step: Step): Step => ({
    ...step,
    before: { ...step.before, entries: map(step.before.entries) },
    after: { ...step.after, entries: map(step.after.entries) },
  });
  return {
    ...model,
    entries: map(model.entries),
    saved: map(model.saved),
    past: model.past.map(mapStep),
    future: model.future.map(mapStep),
    files: {
      ...model.files,
      [id]: { imageBytes: model.files[id]?.imageBytes ?? null, videoBytes: bytes },
    },
  };
}

export function replaceEntry(entries: Entry[], next: Entry): Entry[] {
  const index = entries.findIndex((entry) => entry.id === next.id);
  if (index === -1) return [...entries, next];
  return entries.map((entry) => (entry.id === next.id ? next : entry));
}

export function singleSource(src: string): ImageSource {
  return { src, focus: { x: 0.5, y: 0.5 } };
}
