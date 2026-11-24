import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { assertTitleFits, OgFrame } from "./templates";
import { CAPTURE_HEIGHT, CAPTURE_WIDTH } from "./save-method";
import { isPng, pngSize } from "./png";
import type { Entry, System } from "./types";

const READABLE_FORMATS = new Set(["woff2", "woff", "truetype", "opentype"]);

const fontCache = new Map<string, string>();

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function mimeFor(format: string): string {
  if (format === "woff2") return "font/woff2";
  if (format === "woff") return "font/woff";
  if (format === "truetype") return "font/ttf";
  return "font/otf";
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function familiesOf(stack: string): string[] {
  return stack
    .split(",")
    .map((part) => unquote(part))
    .filter((name) => name && !["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong"].includes(name.toLowerCase()));
}

function formatOf(src: string, formatHint: string | undefined): string | null {
  const hint = formatHint?.toLowerCase().replace(/-variations$/, "");
  if (hint && READABLE_FORMATS.has(hint)) return hint;
  const clean = src.split("?")[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".woff2")) return "woff2";
  if (clean.endsWith(".woff")) return "woff";
  if (clean.endsWith(".ttf")) return "truetype";
  if (clean.endsWith(".otf")) return "opentype";
  return null;
}

function firstReadableUrl(src: string): { url: string; format: string } | null {
  const pattern = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)(?:\s*format\(\s*["']?([^"')]+)["']?\s*\))?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(src))) {
    const url = match[1] || match[2] || match[3] || "";
    if (!url || url.startsWith("local(")) continue;
    const format = formatOf(url, match[4]);
    if (!format) continue;
    return { url, format };
  }
  return null;
}

async function inlineFonts(familyStack: string): Promise<string> {
  const names = familiesOf(familyStack);
  const cacheKey = names.join("|");
  const cached = fontCache.get(cacheKey);
  if (cached != null) return cached;
  try {
    const css = await collectFontFaces(names);
    fontCache.set(cacheKey, css);
    return css;
  } catch (error) {
    fontCache.delete(cacheKey);
    throw error;
  }
}

async function collectFontFaces(names: string[]): Promise<string> {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const rules: string[] = [];
  let sawFamily = false;
  let sawUnusable = false;
  for (const sheet of document.styleSheets) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of cssRules) {
      if (rule.constructor.name !== "CSSFontFaceRule" && !(rule instanceof CSSFontFaceRule)) continue;
      const face = rule as CSSFontFaceRule;
      const family = unquote(face.style.getPropertyValue("font-family"));
      if (!wanted.has(family.toLowerCase())) continue;
      sawFamily = true;
      const style = face.style.getPropertyValue("font-style").trim() || "normal";
      if (style !== "normal") continue;
      const src = face.style.getPropertyValue("src");
      const picked = firstReadableUrl(src);
      if (!picked) {
        sawUnusable = true;
        continue;
      }
      const absolute = new URL(picked.url, sheet.href || document.baseURI).href;
      const response = await fetch(absolute);
      if (!response.ok) throw new Error(`Could not find the ${names[0]} font on this page.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const weight = face.style.getPropertyValue("font-weight").trim() || "normal";
      const data = bytesToDataUrl(bytes, mimeFor(picked.format));
      rules.push(
        `@font-face{font-family:"${family.replace(/"/g, "")}";src:url(${data}) format("${picked.format}");font-weight:${weight};font-style:normal;}`,
      );
    }
  }
  if (rules.length > 0) return rules.join("");
  if (sawFamily && sawUnusable) {
    throw new Error(`Could not find the ${names[0]} font on this page.`);
  }
  if (!sawFamily) return "";
  throw new Error(`Could not find the ${names[0]} font on this page.`);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 8000) return;
    await wait(30);
  }
}

export async function capturePng(entry: Entry, system: System, template: string): Promise<string> {
  await assertTitleFits(entry, system, template);
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.inert = true;
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;width:1200px;height:630px;pointer-events:none";
  document.body.appendChild(host);
  let root: Root | null = null;
  try {
    root = createRoot(host);
    flushSync(() => {
      root?.render(createElement(OgFrame, { entry, system, template }));
    });
    await waitFor(() => {
      const title = host.querySelector("[data-og-title]");
      if (!title) return host.querySelector("[data-og-frame]") != null;
      return title.getAttribute("data-og-ready") === "true";
    });
    const frame = host.querySelector("[data-og-frame]");
    if (!frame) throw new Error("The image could not be saved. Your draft is still here; try again.");
    const images = [...frame.querySelectorAll("img")];
    await Promise.all(
      images.map(async (img) => {
        try {
          await img.decode();
        } catch {
          throw new Error(`Could not load ${img.currentSrc || img.src}.`);
        }
      }),
    );
    const clone = frame.cloneNode(true) as HTMLElement;
    const originals = [...frame.querySelectorAll("img")];
    const clones = [...clone.querySelectorAll("img")];
    await Promise.all(
      clones.map(async (img, index) => {
        const source = originals[index];
        const url = source?.currentSrc || source?.src || img.src;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url}.`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const type = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
        img.setAttribute("src", bytesToDataUrl(bytes, type));
      }),
    );
    const fontCss = await inlineFonts(system.font.family);
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CAPTURE_WIDTH}" height="${CAPTURE_HEIGHT}" viewBox="0 0 1200 630">` +
      `<foreignObject x="0" y="0" width="1200" height="630">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:1200px;height:630px;margin:0;padding:0;overflow:hidden">` +
      `<style>${fontCss}</style>${serialized}` +
      `</div></foreignObject></svg>`;
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const painted = new Image();
    painted.src = svgUrl;
    await painted.decode();
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The image could not be saved. Your draft is still here; try again.");
    const draw = () => {
      context.clearRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
      context.drawImage(painted, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    };
    draw();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    draw();
    const dataUrl = canvas.toDataURL("image/png");
    const bytes = dataUrlToBytes(dataUrl);
    const size = pngSize(bytes);
    if (!isPng(bytes) || !size || size.width !== CAPTURE_WIDTH || size.height !== CAPTURE_HEIGHT) {
      throw new Error(
        `The capture came out ${size?.width ?? 0}×${size?.height ?? 0}, not ${CAPTURE_WIDTH}×${CAPTURE_HEIGHT}.`,
      );
    }
    return dataUrl;
  } finally {
    root?.unmount();
    host.remove();
  }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function pngForSave(options: {
  entry: Entry;
  system: System;
  template: string;
  method: "capture" | "source-bytes" | "source-redraw";
  sourceUrl?: string;
}): Promise<string> {
  if (options.method === "capture" || !options.sourceUrl) {
    return capturePng(options.entry, options.system, options.template);
  }
  const response = await fetch(options.sourceUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${options.sourceUrl}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (options.method === "source-bytes") {
    return `data:image/png;base64,${bytesToBase64(bytes)}`;
  }
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The image could not be saved. Your draft is still here; try again.");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}
