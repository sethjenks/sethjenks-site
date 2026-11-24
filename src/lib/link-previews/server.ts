import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { link, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { definitionHash } from "./definition-hash";
import { formatMegabytes, IMAGE_LIMIT, VIDEO_LIMIT, isMp4 } from "./format";
import { imageKind, isPng, pngSize } from "./png";
import {
  ALLOWED_IMAGE_FOLDERS,
  MANIFEST_PATH,
  PUBLIC_OG_DIR,
  REGISTRY_PATH,
  SOURCES_DIR,
  servedVideoPath,
} from "./paths";
import { fitsFrame } from "./save-method";
import { TEMPLATE_NAMES, isTemplateName, templateUses } from "./template-names";
import type { FileInfo, ToolData } from "./model";
import type { Entry, EntryImage, EntryVideo, Focus, ImageSheet, ImageSource, Layout, Manifest, SourceFile, System, Theme } from "./types";
import { isSheet, resolveLayout } from "./types";

const MB = 1024 * 1024;
const SAVE_BODY_LIMIT = 10 * MB;
const UPLOAD_BODY_LIMIT = Math.ceil((IMAGE_LIMIT * 4) / 3) + 64 * 1024;
const VIDEO_JSON_LIMIT = 4 * 1024;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATH_PATTERN = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;
const LOCAL_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

let queue: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function jsonOk(body: unknown): Response {
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

function isLocalHost(host: string): boolean {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[::1]")) return true;
  const name = value.split(":")[0] ?? "";
  return name === "localhost" || name === "127.0.0.1";
}

function forwardedListOk(header: string | null): boolean {
  if (!header) return true;
  return header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .every((part) => LOCAL_IPS.has(part));
}

export function localRequestError(request: Request): string | null {
  const host = request.headers.get("host");
  if (!host || !isLocalHost(host)) return "Local requests only.";
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return "Local requests only.";
  }
  if (url.protocol !== "http:" || !isLocalHost(url.host)) return "Local requests only.";
  if (request.headers.has("forwarded")) return "Local requests only.";
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost && forwardedHost !== host) return "Local requests only.";
  if (!forwardedListOk(request.headers.get("x-forwarded-for"))) return "Local requests only.";
  if (!forwardedListOk(request.headers.get("x-real-ip"))) return "Local requests only.";
  return null;
}

function toolError(request: Request): string | null {
  const host = request.headers.get("host");
  if (request.headers.get("origin") !== `http://${host}`) return "Use the Link Previews tool.";
  if (request.headers.get("sec-fetch-site") !== "same-origin") return "Use the Link Previews tool.";
  if (request.headers.get("x-link-previews") !== "1") return "Use the Link Previews tool.";
  return null;
}

function mediaType(request: Request): string {
  return request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
}

async function readLimited(
  request: Request,
  max: number,
  tooLarge: (known?: number) => string,
): Promise<Uint8Array | Response> {
  const declared = request.headers.get("content-length");
  const declaredSize = declared == null ? undefined : Number(declared);
  if (declaredSize != null && (!Number.isFinite(declaredSize) || declaredSize < 0)) {
    return jsonError(400, "Send JSON.");
  }
  if (declaredSize != null && declaredSize > max) return jsonError(413, tooLarge(declaredSize));
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return jsonError(413, tooLarge(declaredSize));
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function guard(
  request: Request,
  options: { max: number; contentType: string; tooLarge: (known?: number) => string },
): Promise<Uint8Array | Response> {
  if (process.env.NODE_ENV !== "development") return jsonError(403, "Development only.");
  if (request.method !== "POST") return jsonError(403, "POST only.");
  const local = localRequestError(request);
  if (local) return jsonError(403, local);
  const tool = toolError(request);
  if (tool) return jsonError(403, tool);
  if (mediaType(request) !== options.contentType) return jsonError(403, "Send JSON.");
  return readLimited(request, options.max, options.tooLarge);
}

function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

function parseJson(bytes: Uint8Array): unknown | Response {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return jsonError(400, "Send JSON.");
  }
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readManifest(): Manifest {
  const raw = readFileSync(path.join(process.cwd(), MANIFEST_PATH), "utf8");
  return JSON.parse(raw) as Manifest;
}

async function atomicWrite(file: string, data: Uint8Array | string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${randomBytes(6).toString("hex")}.tmp`);
  await writeFile(tmp, data);
  await rename(tmp, file);
}

function sha12(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 12);
}

function sourceOk(src: string): boolean {
  if (src.length < 1 || src.length > 300) return false;
  if (src.includes("\\") || src.includes("\0")) return false;
  if (path.posix.normalize(src) !== src) return false;
  const folder = ALLOWED_IMAGE_FOLDERS.find((item) => src.startsWith(`${item}/`));
  if (!folder) return false;
  const base = src.slice(folder.length + 1);
  if (!base || base.includes("/") || base.startsWith(".")) return false;
  if (!/^[A-Za-z0-9._-]+$/.test(base)) return false;
  if (!/\.(png|jpe?g|webp)$/i.test(base)) return false;
  return existsSync(path.join(process.cwd(), src));
}

function focusOk(value: unknown): value is Focus {
  const item = record(value);
  if (!item) return false;
  const x = item.x;
  const y = item.y;
  return typeof x === "number" && typeof y === "number" && x >= 0 && x <= 1 && y >= 0 && y <= 1;
}

function parseImage(value: unknown): EntryImage | Response {
  if (value == null) return null;
  const item = record(value);
  if (!item) return jsonError(400, "Use an image from the picker.");
  if (Array.isArray(item.sheet)) {
    const columns = item.columns;
    if (!Number.isInteger(columns) || typeof columns !== "number" || columns < 1 || columns > 6) {
      return jsonError(400, "Use an image from the picker.");
    }
    if (item.sheet.length < 1 || item.sheet.length > 12) return jsonError(400, "Use an image from the picker.");
    const sheet: string[] = [];
    for (const src of item.sheet) {
      if (typeof src !== "string" || !sourceOk(src)) return jsonError(400, "Use an image from the picker.");
      sheet.push(src);
    }
    const parsed: ImageSheet = { sheet, columns };
    return parsed;
  }
  if (typeof item.src !== "string" || !sourceOk(item.src) || !focusOk(item.focus)) {
    return jsonError(400, "Use an image from the picker.");
  }
  const source: ImageSource = { src: item.src, focus: { x: item.focus.x, y: item.focus.y } };
  if (item.zoom != null) {
    if (typeof item.zoom !== "number" || item.zoom < 1 || item.zoom > 4) {
      return jsonError(400, "Use an image from the picker.");
    }
    if (item.zoom !== 1) source.zoom = item.zoom;
  }
  return source;
}

function workIds(): Set<string> {
  try {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), "content/work.json"), "utf8")) as { id?: string }[];
    return new Set(raw.flatMap((item) => (typeof item.id === "string" ? [item.id] : [])));
  } catch {
    return new Set();
  }
}

function pageExists(pathname: string): boolean {
  const app = path.join(process.cwd(), "src/app");
  if (pathname === "/") return existsSync(path.join(app, "page.tsx"));
  const parts = pathname.slice(1).split("/");
  if (existsSync(path.join(app, ...parts, "page.tsx"))) return true;
  if (parts.length === 2 && parts[0] === "work") {
    return existsSync(path.join(app, "work/[id]/page.tsx")) && workIds().has(parts[1] ?? "");
  }
  if (parts.length === 2 && parts[0] === "journal" && /^\d{4}-\d{2}-\d{2}$/.test(parts[1] ?? "")) {
    return existsSync(path.join(app, "journal/[date]/page.tsx"));
  }
  if (parts.length === 3 && parts[0] === "journal" && parts[1] === "tag") {
    return existsSync(path.join(app, "journal/tag/[tag]/page.tsx"));
  }
  return false;
}

function parseEntry(value: unknown): Entry | Response {
  const item = record(value);
  if (!item) return jsonError(400, "Choose a page.");
  const id = item.id;
  if (typeof id !== "string" || id.length > 64 || !ID_PATTERN.test(id)) return jsonError(400, "Choose a page.");
  const pagePath = item.path;
  if (typeof pagePath !== "string" || pagePath.length > 200 || !PATH_PATTERN.test(pagePath)) {
    return jsonError(400, "Use a path such as /notes, lowercase, without a query or hash.");
  }
  const title = item.title;
  if (typeof title !== "string" || title.length > 200 || title.trim().length === 0) {
    return jsonError(400, "Add a title.");
  }
  let alt: string | undefined;
  if (item.alt != null) {
    if (typeof item.alt !== "string") return jsonError(400, "The alt text must be 1 to 420 characters.");
    const trimmed = item.alt.trim();
    if (trimmed.length < 1 || trimmed.length > 420) {
      return jsonError(400, "The alt text must be 1 to 420 characters.");
    }
    alt = trimmed;
  }
  const group = item.group;
  if (typeof group !== "string" || group.trim().length === 0 || group.trim().length > 40) {
    return jsonError(400, "Add a group.");
  }
  const theme = item.theme;
  if (theme !== "light" && theme !== "dark") return jsonError(400, "Choose a light or dark theme.");
  const image = parseImage(item.image);
  if (isResponse(image)) return image;
  let layout: Layout;
  if (item.layout == null) {
    layout = image == null ? "type-only" : "type-and-image";
  } else if (item.layout === "type-only" || item.layout === "type-and-image" || item.layout === "image-only") {
    layout = item.layout;
  } else {
    return jsonError(400, "Choose a layout: type-only, type-and-image, image-only.");
  }
  if (layout !== "type-only" && image == null) return jsonError(400, "Choose an image for this layout.");
  const entry: Entry = {
    id,
    path: pagePath,
    title,
    group: group.trim(),
    theme: theme as Theme,
    layout,
    image,
    version: null,
    savedHash: null,
  };
  if (alt) entry.alt = alt;
  return entry;
}

function dataUrlBytes(value: unknown): Uint8Array | Response {
  if (typeof value !== "string" || !value.startsWith("data:image/png;base64,")) {
    return jsonError(400, "The PNG must be exactly 2400×1260.");
  }
  try {
    return Uint8Array.from(Buffer.from(value.slice("data:image/png;base64,".length), "base64"));
  } catch {
    return jsonError(400, "The PNG must be exactly 2400×1260.");
  }
}

function pngError(entry: Entry, bytes: Uint8Array): string | null {
  if (!isPng(bytes)) return "The PNG must be exactly 2400×1260.";
  const size = pngSize(bytes);
  if (!size) return "The PNG must be exactly 2400×1260.";
  const layout = resolveLayout(entry);
  const single = entry.image != null && !isSheet(entry.image);
  const zoom = single && entry.image && !isSheet(entry.image) ? (entry.image.zoom ?? 1) : 1;
  if (layout === "image-only" && single && zoom === 1) {
    if (!fitsFrame(size.width, size.height)) {
      return "The PNG must have the frame’s shape (1200:630, within 1%) and be at most 2400×1260.";
    }
    return null;
  }
  if (size.width !== 2400 || size.height !== 1260) return "The PNG must be exactly 2400×1260.";
  return null;
}

export async function saveShareImage(request: Request): Promise<Response> {
  const body = await guard(request, {
    max: SAVE_BODY_LIMIT,
    contentType: "application/json",
    tooLarge: () => "The image is too large to save.",
  });
  if (isResponse(body)) return body;
  const payload = parseJson(body);
  if (isResponse(payload)) return payload;
  const root = record(payload);
  if (!root) return jsonError(400, "Send JSON.");
  const entry = parseEntry(root.entry);
  if (isResponse(entry)) return entry;
  const template = root.template;
  if (typeof template !== "string" || !isTemplateName(template)) {
    return jsonError(400, `Choose a template: ${TEMPLATE_NAMES.join(", ")}.`);
  }
  let color: string | undefined;
  if (root.color != null) {
    if (typeof root.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(root.color)) {
      return jsonError(400, "The color must be a six-digit hex, such as #000000.");
    }
    color = root.color.toLowerCase();
  }
  const png = dataUrlBytes(root.png);
  if (isResponse(png)) return png;
  const shape = pngError(entry, png);
  if (shape) return jsonError(400, shape);
  if (!pageExists(entry.path)) {
    return jsonError(422, `${entry.path} has no page yet. Create the page first, then save its image.`);
  }

  try {
    return await enqueue(async () => {
      const manifest = readManifest();
      const clash = manifest.entries.find((item) => item.path === entry.path && item.id !== entry.id);
      if (clash) return jsonError(409, `Another page already uses ${entry.path}.`);
      const previous = manifest.entries.find((item) => item.id === entry.id);
      const system: System = { ...manifest.system, template };
      if (color != null) system.color = color;
      const savedHash = definitionHash(entry, system, templateUses(template).color);
      const stored: Entry = {
        ...entry,
        version: sha12(png),
        savedHash,
        ...(previous?.video ? { video: previous.video } : {}),
      };
      manifest.system.template = template;
      if (color != null) manifest.system.color = color;
      const index = manifest.entries.findIndex((item) => item.id === entry.id);
      if (index === -1) manifest.entries.push(stored);
      else manifest.entries[index] = stored;
      const file = path.join(process.cwd(), PUBLIC_OG_DIR, `${entry.id}.png`);
      await atomicWrite(file, png);
      await atomicWrite(path.join(process.cwd(), MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
      const info = await stat(file);
      return jsonOk({ entry: stored, file: `${PUBLIC_OG_DIR}/${entry.id}.png`, bytes: info.size });
    });
  } catch (error) {
    console.error(error);
    return jsonError(500, "The image could not be saved. Your draft is still here; try again.");
  }
}

function cleanUploadName(name: string): string | Response {
  if (typeof name !== "string" || name.length > 200) return jsonError(400, "Use a shorter file name.");
  const stripped = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  let slug = stripped.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > 60) slug = slug.slice(0, 60).replace(/-+$/g, "");
  return slug || "image";
}

export async function uploadSource(request: Request): Promise<Response> {
  const body = await guard(request, {
    max: UPLOAD_BODY_LIMIT,
    contentType: "application/json",
    tooLarge: () => "Images can be up to 10 MB.",
  });
  if (isResponse(body)) return body;
  const payload = parseJson(body);
  if (isResponse(payload)) return payload;
  const root = record(payload);
  if (!root) return jsonError(400, "Send JSON.");
  const slug = cleanUploadName(typeof root.name === "string" ? root.name : "");
  if (isResponse(slug)) return slug;
  if (typeof root.data !== "string") return jsonError(415, "Upload a PNG, JPEG or WebP image.");
  const comma = root.data.indexOf(",");
  if (comma < 0) return jsonError(415, "Upload a PNG, JPEG or WebP image.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(root.data.slice(comma + 1), "base64"));
  } catch {
    return jsonError(415, "Upload a PNG, JPEG or WebP image.");
  }
  if (bytes.byteLength > IMAGE_LIMIT) return jsonError(413, "Images can be up to 10 MB.");
  const kind = imageKind(bytes);
  if (!kind) return jsonError(415, "Upload a PNG, JPEG or WebP image.");
  const dir = path.join(process.cwd(), SOURCES_DIR);
  await mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.upload-${randomBytes(6).toString("hex")}.tmp`);
  try {
    await writeFile(tmp, bytes);
    let filename: string | null = null;
    for (let attempt = 0; attempt < 999; attempt += 1) {
      const candidate = attempt === 0 ? `${slug}.${kind}` : `${slug}-${attempt + 1}.${kind}`;
      try {
        await link(tmp, path.join(dir, candidate));
        filename = candidate;
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EEXIST") continue;
        throw error;
      }
    }
    if (!filename) return jsonError(409, "Too many files with this name.");
    return jsonOk({
      source: { src: `${SOURCES_DIR}/${filename}`, label: filename, folder: SOURCES_DIR },
    });
  } catch (error) {
    console.error(error);
    return jsonError(500, "The image could not be saved. Your draft is still here; try again.");
  } finally {
    await unlink(tmp).catch(() => undefined);
  }
}

function videoSizeMessage(known?: number): string {
  if (known == null) return "Videos can be up to 8.4 MB.";
  return `Videos can be up to 8.4 MB. This one is ${formatMegabytes(known)}.`;
}

function parsePixel(value: string | null, noun: "width" | "height"): number | Response {
  if (value == null || !/^[0-9]+$/.test(value)) {
    return jsonError(400, `Send the video's ${noun} in pixels.`);
  }
  const size = Number(value);
  if (!Number.isInteger(size) || size < 1 || size > 8192) {
    return jsonError(400, `Send the video's ${noun} in pixels.`);
  }
  return size;
}

export async function saveVideo(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== "development") return jsonError(403, "Development only.");
  if (request.method !== "POST") return jsonError(403, "POST only.");
  const local = localRequestError(request);
  if (local) return jsonError(403, local);
  const tool = toolError(request);
  if (tool) return jsonError(403, tool);
  const type = mediaType(request);
  if (type === "application/json") return removeVideo(request);
  if (type !== "video/mp4") return jsonError(403, "Send JSON.");
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!ID_PATTERN.test(id) || id.length > 64) return jsonError(400, "Choose a page.");
  const width = parsePixel(url.searchParams.get("width"), "width");
  if (isResponse(width)) return width;
  const height = parsePixel(url.searchParams.get("height"), "height");
  if (isResponse(height)) return height;
  const bytes = await readLimited(request, VIDEO_LIMIT, videoSizeMessage);
  if (isResponse(bytes)) return bytes;
  if (bytes.byteLength === 0) return jsonError(400, "Nothing was sent.");
  if (!isMp4(bytes)) return jsonError(415, "That isn’t an MP4 video.");
  const src = servedVideoPath(id);
  try {
    return await enqueue(async () => {
      const manifest = readManifest();
      const index = manifest.entries.findIndex((item) => item.id === id);
      if (index === -1) return jsonError(404, `No page has the id ${id}. Save the page's image first.`);
      const clash = manifest.entries.find((item, itemIndex) => itemIndex !== index && item.video?.src === src);
      if (clash) return jsonError(409, `Another page already uses ${src}.`);
      const video: EntryVideo = {
        src,
        type: "video/mp4",
        width,
        height,
        version: sha12(bytes),
      };
      manifest.entries[index] = { ...manifest.entries[index], video };
      await atomicWrite(path.join(process.cwd(), src), bytes);
      await atomicWrite(path.join(process.cwd(), MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
      const info = await stat(path.join(process.cwd(), src));
      return jsonOk({ video, bytes: info.size });
    });
  } catch (error) {
    console.error(error);
    return jsonError(500, "The video could not be saved. Try again.");
  }
}

async function removeVideo(request: Request): Promise<Response> {
  const bytes = await readLimited(request, VIDEO_JSON_LIMIT, () => "Send a video, or { id, remove: true }.");
  if (isResponse(bytes)) return bytes;
  const payload = parseJson(bytes);
  if (isResponse(payload)) return payload;
  const root = record(payload);
  if (!root || root.remove !== true) return jsonError(400, "Send a video, or { id, remove: true }.");
  const id = root.id;
  if (typeof id !== "string" || id.length > 64 || !ID_PATTERN.test(id)) return jsonError(400, "Choose a page.");
  try {
    return await enqueue(async () => {
      const manifest = readManifest();
      const index = manifest.entries.findIndex((item) => item.id === id);
      if (index === -1) return jsonError(404, `No page has the id ${id}.`);
      const current = manifest.entries[index];
      const kept = current?.video?.src;
      if (!current) return jsonError(404, `No page has the id ${id}.`);
      const next: Entry = { ...current };
      delete next.video;
      manifest.entries[index] = next;
      await atomicWrite(path.join(process.cwd(), MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
      return jsonOk(kept ? { kept } : {});
    });
  } catch (error) {
    console.error(error);
    return jsonError(500, "The video could not be removed. Try again.");
  }
}

export async function serveSource(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (process.env.NODE_ENV !== "development") {
    return new Response("Development only.", { status: 403, headers });
  }
  if (localRequestError(request)) {
    return new Response("Local requests only.", { status: 403, headers });
  }
  const file = new URL(request.url).searchParams.get("file") ?? "";
  if (!/^[a-z0-9-]+\.(png|jpe?g|webp)$/.test(file)) {
    return new Response("Not found", { status: 404, headers });
  }
  const full = path.join(process.cwd(), SOURCES_DIR, file);
  try {
    const bytes = await readFile(full);
    const ext = file.slice(file.lastIndexOf(".") + 1);
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new Response(bytes, { headers: { ...headers, "Content-Type": type } });
  } catch {
    return new Response("Not found", { status: 404, headers });
  }
}

async function fileSize(file: string): Promise<number | null> {
  try {
    const info = await stat(file);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

export async function loadToolData(): Promise<ToolData> {
  const manifest = readManifest();
  const names = await readdir(path.join(process.cwd(), SOURCES_DIR));
  const sources: SourceFile[] = names
    .filter((name) => /^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i.test(name) && !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ src: `${SOURCES_DIR}/${name}`, label: name, folder: SOURCES_DIR }));
  const files: Record<string, FileInfo> = {};
  for (const entry of manifest.entries) {
    files[entry.id] = {
      imageBytes: await fileSize(path.join(process.cwd(), PUBLIC_OG_DIR, `${entry.id}.png`)),
      videoBytes: entry.video ? await fileSize(path.join(process.cwd(), entry.video.src)) : null,
    };
  }
  return { manifest, sources, files, registryPath: REGISTRY_PATH };
}
