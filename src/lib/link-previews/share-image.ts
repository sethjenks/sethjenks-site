import { readFileSync } from "node:fs";
import path from "node:path";
import { getSiteUrl } from "@/lib/site";
import { MANIFEST_PATH, PUBLIC_OG_DIR, publicPathForStored } from "./paths";
import { pngSize } from "./png";
import type { Entry, EntryVideo, Manifest } from "./types";

export type ShareImage = {
  url: string;
  width: number;
  height: number;
  type: "image/png";
  alt: string;
};

export type ShareVideo = {
  url: string;
  type: "video/mp4";
  width: number;
  height: number;
};

function readManifest(): Manifest | null {
  try {
    const raw = readFileSync(path.join(process.cwd(), MANIFEST_PATH), "utf8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export function entryForPath(pathname: string): Entry | undefined {
  const manifest = readManifest();
  if (!manifest) return undefined;
  const clean = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return manifest.entries.find((entry) => entry.path === clean);
}

function altText(entry: Entry): string {
  return (entry.alt ?? entry.title).replace(/\s*\n\s*/g, " ");
}

/** The saved share image for a path, or undefined when its PNG is not on disk. */
export function shareImage(pathname: string): ShareImage | undefined {
  const entry = entryForPath(pathname);
  if (!entry) return undefined;
  const file = path.join(process.cwd(), PUBLIC_OG_DIR, `${entry.id}.png`);
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch {
    return undefined;
  }
  const size = pngSize(bytes);
  if (!size) return undefined;
  const version = entry.version ? `?v=${entry.version}` : "";
  return {
    url: `${getSiteUrl()}/og/${entry.id}.png${version}`,
    width: size.width,
    height: size.height,
    type: "image/png",
    alt: altText(entry),
  };
}

export function shareVideo(pathname: string): ShareVideo | undefined {
  const video: EntryVideo | undefined = entryForPath(pathname)?.video;
  if (!video) return undefined;
  const version = video.version ? `?v=${video.version}` : "";
  return {
    url: `${getSiteUrl()}${publicPathForStored(video.src)}${version}`,
    type: "video/mp4",
    width: video.width,
    height: video.height,
  };
}
