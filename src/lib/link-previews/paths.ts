export const MANIFEST_PATH = "og-images.json";

export const SOURCES_DIR = "og/sources";

export const PUBLIC_OG_DIR = "public/og";

/** Folders a save may point at. The picker lists these too. */
export const ALLOWED_IMAGE_FOLDERS = ["og/sources", "public/media/work"] as const;

export const REGISTRY_PATH = "src/lib/link-previews/templates.tsx";

export const TOOL_PATH = "/link-previews";

export function publicUrlForSource(src: string): string {
  if (src.startsWith("public/")) return `/${src.slice("public/".length)}`;
  if (src.startsWith(`${SOURCES_DIR}/`)) {
    const name = src.slice(SOURCES_DIR.length + 1);
    return `${TOOL_PATH}/source?file=${encodeURIComponent(name)}`;
  }
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

export function publicOgPath(id: string): string {
  return `${PUBLIC_OG_DIR}/${id}.png`;
}

export function servedVideoPath(id: string): string {
  return `${PUBLIC_OG_DIR}/${id}.mp4`;
}

export function publicPathForStored(src: string): string {
  if (src.startsWith("public/")) return `/${src.slice("public/".length)}`;
  if (src.startsWith("/")) return src;
  return `/${src}`;
}
