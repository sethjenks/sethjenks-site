import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const siteRoot = path.resolve(rootDir, "../..");
const entriesDir = path.join(siteRoot, "content", "entries");
const inboxDir = path.join(siteRoot, "studio", "inbox");
const mediaDir = path.join(siteRoot, "public", "media");
const toolcraftServerIdentityPath = "/.toolcraft/server-identity.json";
const imageExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const siteGeistDir = path.join(siteRoot, "node_modules", "geist");

function assertInside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : `${resolvedRoot}${path.sep}`;

  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(prefix)
  ) {
    throw new Error("Path is outside the allowed directory.");
  }

  return resolvedCandidate;
}

function readHtmlAppTitle(source: string): string | null {
  const appTitleMeta = source
    .match(/<meta\b[^>]*>/gi)
    ?.find((tag) => tag.match(/\bname\s*=\s*["']toolcraft-app-title["']/i));

  return appTitleMeta?.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? null;
}

async function createToolcraftServerIdentity() {
  const indexSource = await fs.readFile(path.join(rootDir, "index.html"), "utf8");

  return {
    appTitle: readHtmlAppTitle(indexSource),
    root: await fs.realpath(rootDir),
  };
}

function toolcraftServerIdentityPlugin(): Plugin {
  function handleIdentityRequest(
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: unknown) => void,
  ) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    if (requestUrl.pathname !== toolcraftServerIdentityPath) {
      next();
      return;
    }

    createToolcraftServerIdentity()
      .then((identity) => {
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.setHeader("cache-control", "no-store");
        response.end(JSON.stringify(identity));
      })
      .catch(next);
  }

  return {
    name: "toolcraft-server-identity",
    configurePreviewServer(server) {
      server.middlewares.use(handleIdentityRequest);
    },
    configureServer(server) {
      server.middlewares.use(handleIdentityRequest);
    },
  };
}

async function readAuthoringBootstrap() {
  const entryFiles = await fs.readdir(entriesDir);
  const entries = await Promise.all(
    entryFiles
      .filter((fileName) => fileName.endsWith(".json"))
      .map(async (fileName) => {
        const source = await fs.readFile(path.join(entriesDir, fileName), "utf8");
        const entry = JSON.parse(source) as {
          date?: unknown;
          id?: unknown;
          title?: unknown;
        };
        return {
          date: String(entry.date ?? ""),
          id: String(entry.id ?? ""),
          title: String(entry.title ?? ""),
        };
      }),
  );
  const inbox = await fs
    .readdir(inboxDir)
    .catch((error: NodeJS.ErrnoException) =>
      error.code === "ENOENT" ? [] : Promise.reject(error),
    );

  return {
    entries: entries
      .filter((entry) => entry.date && entry.id && entry.title)
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    inbox: inbox
      .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
      .sort(),
  };
}

function jsonResponse(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(value));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 40 * 1024 * 1024) {
      throw new Error("Assignment payload is larger than 40 MB.");
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function contentTypeFor(fileName: string): string {
  switch (path.extname(fileName).toLowerCase()) {
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function parsePngDataUrl(dataUrl: unknown): Buffer {
  if (typeof dataUrl !== "string") {
    throw new Error("PNG image data is required.");
  }
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Assigned output must be a PNG data URL.");
  }
  return Buffer.from(match[1], "base64");
}

function parseVideoDataUrl(dataUrl: unknown): {
  bytes: Buffer;
  extension: "mp4" | "webm";
} {
  if (typeof dataUrl !== "string") {
    throw new Error("Video data is required.");
  }
  const match =
    /^data:(video\/(?:mp4|webm)(?:;[^,]+)?);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(
      dataUrl,
    );
  if (!match) {
    throw new Error("Assigned output must be an MP4 or WebM data URL.");
  }
  return {
    bytes: Buffer.from(match[2], "base64"),
    extension: match[1].includes("webm") ? "webm" : "mp4",
  };
}

async function assignIllustration(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Assignment payload must be an object.");
  }

  const { alt, dataUrl, entryId, kind, plate, videoDataUrl } = body as Record<
    string,
    unknown
  >;
  if (
    typeof entryId !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entryId)
  ) {
    throw new Error("Choose a valid journal entry.");
  }
  if (typeof alt !== "string" || alt.trim().length === 0) {
    throw new Error("Alt text is required.");
  }

  const assignKind =
    kind === "video" || kind === "still" || kind === "plate" ? kind : "plate";

  const fileNames = await fs.readdir(entriesDir);
  let entryPath: string | undefined;
  let entry: Record<string, unknown> | undefined;

  for (const fileName of fileNames.filter((name) => name.endsWith(".json"))) {
    const candidatePath = path.join(entriesDir, fileName);
    const candidate = JSON.parse(
      await fs.readFile(candidatePath, "utf8"),
    ) as Record<string, unknown>;
    if (candidate.id === entryId) {
      entryPath = candidatePath;
      entry = candidate;
      break;
    }
  }

  if (!entryPath || !entry) {
    throw new Error(`Journal entry "${entryId}" was not found.`);
  }

  await fs.mkdir(mediaDir, { recursive: true });
  const safeEntryPath = assertInside(entriesDir, entryPath);
  const nonce = `${process.pid}-${Date.now()}`;
  const entryTempPath = `${safeEntryPath}.${nonce}.tmp`;

  if (assignKind === "video") {
    const video = parseVideoDataUrl(videoDataUrl);
    const mediaSrc = `/media/${entryId}.${video.extension}`;
    const mediaPath = assertInside(
      mediaDir,
      path.join(mediaDir, `${entryId}.${video.extension}`),
    );
    const mediaTempPath = `${mediaPath}.${nonce}.tmp`;
    const updatedEntry = {
      ...entry,
      media: {
        src: mediaSrc,
        alt: alt.trim(),
        type: "video",
      },
    };
    await fs.writeFile(mediaTempPath, video.bytes);
    await fs.writeFile(
      entryTempPath,
      `${JSON.stringify(updatedEntry, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(mediaTempPath, mediaPath);
    await fs.rename(entryTempPath, safeEntryPath);
    return { mediaSrc };
  }

  const pngBytes = parsePngDataUrl(dataUrl);
  const mediaSrc = `/media/${entryId}.png`;
  const mediaPath = assertInside(mediaDir, path.join(mediaDir, `${entryId}.png`));
  const mediaTempPath = `${mediaPath}.${nonce}.tmp`;

  if (assignKind === "still") {
    const updatedEntry = {
      ...entry,
      media: {
        src: mediaSrc,
        alt: alt.trim(),
        type: "image",
      },
    };
    await fs.writeFile(mediaTempPath, pngBytes);
    await fs.writeFile(
      entryTempPath,
      `${JSON.stringify(updatedEntry, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(mediaTempPath, mediaPath);
    await fs.rename(entryTempPath, safeEntryPath);
    return { mediaSrc };
  }

  if (!plate || typeof plate !== "object") {
    throw new Error("Live plate assignment requires a plate recipe.");
  }

  const plateSrc = `/media/${entryId}.plate.json`;
  const platePath = assertInside(
    mediaDir,
    path.join(mediaDir, `${entryId}.plate.json`),
  );
  const plateTempPath = `${platePath}.${nonce}.tmp`;
  const updatedEntry = {
    ...entry,
    media: {
      src: mediaSrc,
      plate: plateSrc,
      alt: alt.trim(),
      type: "plate",
    },
  };

  await fs.writeFile(mediaTempPath, pngBytes);
  await fs.writeFile(
    plateTempPath,
    `${JSON.stringify(plate, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    entryTempPath,
    `${JSON.stringify(updatedEntry, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(mediaTempPath, mediaPath);
  await fs.rename(plateTempPath, platePath);
  await fs.rename(entryTempPath, safeEntryPath);

  return { mediaSrc, plateSrc };
}

function journalAuthoringPlugin(): Plugin {
  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: unknown) => void,
  ) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    try {
      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/journal/bootstrap"
      ) {
        jsonResponse(response, 200, await readAuthoringBootstrap());
        return;
      }

      if (
        request.method === "GET" &&
        requestUrl.pathname === "/api/journal/inbox"
      ) {
        const fileName = requestUrl.searchParams.get("name") ?? "";
        if (
          path.basename(fileName) !== fileName ||
          !imageExtensions.has(path.extname(fileName).toLowerCase())
        ) {
          jsonResponse(response, 400, { error: "Invalid inbox file." });
          return;
        }
        const inboxPath = assertInside(
          inboxDir,
          path.join(inboxDir, fileName),
        );
        const bytes = await fs.readFile(inboxPath);
        response.statusCode = 200;
        response.setHeader("content-type", contentTypeFor(fileName));
        response.setHeader("cache-control", "no-store");
        response.end(bytes);
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/journal/assign"
      ) {
        const result = await assignIllustration(await readJsonBody(request));
        jsonResponse(response, 200, result);
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Journal authoring failed.";
      jsonResponse(response, 400, { error: message });
      return;
    }

    next();
  }

  return {
    name: "journal-authoring",
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
  };
}

export default defineConfig(() => ({
  base: "/",
  plugins: [
    journalAuthoringPlugin(),
    toolcraftServerIdentityPlugin(),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@ascii-plate": path.join(siteRoot, "src/lib/ascii-plate/index.ts"),
    },
  },
  server: {
    fs: {
      allow: [rootDir, siteRoot, siteGeistDir],
    },
  },
}));
