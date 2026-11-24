"use client";

/**
 * Share image templates. The Link Previews tool's "Make your own" prompt
 * sends an agent here.
 *
 * To add a template: build a component from the shared parts in this file
 * (frame root, text column, fitted title, panel). Add its name and `uses`
 * in template-names.ts, then one entry on TEMPLATES. Don't change Plate,
 * Poster, or Inset — every saved image is drawn by one of them. A new
 * site-wide value goes on `system`, and into the definition hash only when
 * the template uses it, as Poster does with `color`.
 *
 * Every template keeps these rules: inline styles only (the capture
 * serializes this DOM); the title goes through FittedTitle; draw type only
 * when there is no image, never a placeholder; handle sheets and both
 * themes; the text's bottom inset is `system.textBottom`. Images are a
 * plain img via PlainImage — next/image does not survive the capture.
 */

import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { DEFAULT_TEMPLATE, isTemplateName, type TemplateName } from "./template-names";
import { publicUrlForSource } from "./paths";
import { FRAME_HEIGHT, FRAME_WIDTH } from "./save-method";
import type { Box, Entry, EntryImage, ImageBox, ImageSource, System, TemplateUses, TitleFit } from "./types";
import { isSheet, isSource, resolveLayout } from "./types";

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
  "inherit",
  "initial",
  "unset",
]);

export function quoteFamily(family: string): string {
  return family
    .split(",")
    .map((part) => {
      const name = part.trim().replace(/^["']|["']$/g, "");
      if (GENERIC_FAMILIES.has(name.toLowerCase())) return name;
      return `"${name.replace(/"/g, "")}"`;
    })
    .join(", ");
}

const reset: CSSProperties = {
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
  border: 0,
  minWidth: 0,
  letterSpacing: "normal",
  textTransform: "none",
  textAlign: "left",
  fontStyle: "normal",
};

export function PlainImage({
  src,
  style,
  className,
}: {
  src: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- The capture serializes a plain img, and next/image does not survive the SVG foreignObject. The dev tool's thumbnails use the same element.
    <img alt="" className={className} draggable={false} src={src} style={style} />
  );
}

type MeasureSpec = {
  family: string;
  titleWeight: number;
  labelWeight: number;
  lineHeight: number;
  min: number;
  max: number;
  maxLines: number;
  boxHeight: number;
};

const fitCache = new Map<string, TitleFit>();
let fontsSettled = false;

export function clearTitleFitCache(): void {
  fitCache.clear();
}

async function loadSpecFonts(spec: MeasureSpec): Promise<void> {
  if (typeof document === "undefined") return;
  const family = quoteFamily(spec.family);
  try {
    await document.fonts.load(`${spec.titleWeight} 150px ${family}`);
    await document.fonts.load(`${spec.labelWeight} 24px ${family}`);
    await document.fonts.ready;
  } catch {
    // An installed font has no face to load. Measuring still runs.
  }
  if (!fontsSettled) {
    clearTitleFitCache();
    fontsSettled = true;
  }
}

export async function loadFrameFonts(system: System): Promise<void> {
  await loadSpecFonts(specFrom(system, 0));
}

function specFrom(system: System, boxHeight: number): MeasureSpec {
  return {
    family: system.font.family,
    titleWeight: system.font.titleWeight,
    labelWeight: system.font.labelWeight,
    lineHeight: system.lineHeight,
    min: system.titleSize.min,
    max: system.titleSize.max,
    maxLines: system.maxLines,
    boxHeight,
  };
}

let measurer: HTMLDivElement | null = null;

function measureAt(text: string, size: number, width: number, spec: MeasureSpec): { fits: boolean; lines: number } {
  if (typeof document === "undefined") {
    return { fits: true, lines: 1 };
  }
  if (!measurer) {
    measurer = document.createElement("div");
    measurer.setAttribute("aria-hidden", "true");
    document.body.appendChild(measurer);
  }
  const style = measurer.style;
  style.position = "fixed";
  style.left = "-20000px";
  style.top = "0";
  style.visibility = "hidden";
  style.boxSizing = "border-box";
  style.margin = "0";
  style.padding = "0";
  style.border = "0";
  style.width = `${width}px`;
  style.fontFamily = quoteFamily(spec.family);
  style.fontWeight = String(spec.titleWeight);
  style.fontSize = `${size}px`;
  style.lineHeight = String(spec.lineHeight);
  style.fontOpticalSizing = "auto";
  style.whiteSpace = "pre-wrap";
  style.overflowWrap = "normal";
  style.wordBreak = "normal";
  style.letterSpacing = "normal";
  style.fontStyle = "normal";
  measurer.textContent = text;
  const tooWide = measurer.scrollWidth > measurer.clientWidth + 0.5;
  const height = measurer.getBoundingClientRect().height;
  const lines = Math.max(1, Math.round(height / (size * spec.lineHeight)));
  const fits = !tooWide && lines <= spec.maxLines && height <= spec.boxHeight + 0.5;
  return { fits, lines };
}

function fitWithSpec(text: string, width: number, spec: MeasureSpec): TitleFit {
  const key = JSON.stringify([spec, width, text, fontsSettled]);
  const cached = fontsSettled ? fitCache.get(key) : undefined;
  if (cached) return cached;
  const min = spec.min;
  const max = spec.max;
  let best: TitleFit | null = null;
  for (let size = max; size >= min; size -= 1) {
    const measured = measureAt(text, size, width, spec);
    if (measured.fits) {
      best = { size, lines: measured.lines, overflow: false };
      break;
    }
  }
  if (!best) {
    const minMeasure = measureAt(text, min, width, spec);
    const overflow: TitleFit = { size: min, lines: minMeasure.lines, overflow: true };
    if (fontsSettled) fitCache.set(key, overflow);
    return overflow;
  }
  const limit = Math.max(min, best.size * 0.9);
  for (let size = best.size - 1; size >= limit - 1e-6; size -= 1) {
    const measured = measureAt(text, size, width, spec);
    if (measured.fits && measured.lines < best.lines) {
      best = { size, lines: measured.lines, overflow: false };
      break;
    }
  }
  if (fontsSettled) fitCache.set(key, best);
  return best;
}

export function fitTitleText(text: string, box: Box, system: System): TitleFit {
  return fitWithSpec(text, box.width, specFrom(system, box.height));
}

export async function assertTitleFits(entry: Entry, system: System, template: string): Promise<void> {
  if (resolveLayout(entry) === "image-only") return;
  await loadFrameFonts(system);
  const box = templateTitleBox(entry, system, template);
  if (!box) return;
  const fit = fitTitleText(entry.title, box, system);
  if (fit.overflow) {
    throw new Error(
      "The title doesn’t fit, even at 40px. Shorten it or break it differently, then save.",
    );
  }
}

function titleHeight(system: System): number {
  const labelLine = Math.round(system.labelSize * system.labelLineHeight);
  return FRAME_HEIGHT - system.margin - system.textBottom - labelLine - system.labelGap;
}

function showsDrawnImage(entry: Entry): boolean {
  return resolveLayout(entry) === "type-and-image" && entry.image != null;
}

function useTitleFit(text: string, box: Box, system: System): { fit: TitleFit; ready: boolean } {
  const family = system.font.family;
  const titleWeight = system.font.titleWeight;
  const labelWeight = system.font.labelWeight;
  const lineHeight = system.lineHeight;
  const min = system.titleSize.min;
  const max = system.titleSize.max;
  const maxLines = system.maxLines;
  const width = box.width;
  const height = box.height;
  const spec = useMemo<MeasureSpec>(
    () => ({ family, titleWeight, labelWeight, lineHeight, min, max, maxLines, boxHeight: height }),
    [family, titleWeight, labelWeight, lineHeight, min, max, maxLines, height],
  );
  const [fit, setFit] = useState<TitleFit>({ size: max, lines: 1, overflow: false });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadSpecFonts(spec);
      if (cancelled) return;
      setFit(fitWithSpec(text, width, spec));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [text, width, spec]);

  return { fit, ready };
}

export type TitleSlot = {
  text: string;
  style: CSSProperties;
  fit: TitleFit;
};

function FittedTitle({
  text,
  box,
  system,
  color,
  renderTitle,
}: {
  text: string;
  box: Box;
  system: System;
  color: string;
  renderTitle?: (slot: TitleSlot) => ReactNode;
}) {
  const { fit, ready } = useTitleFit(text, box, system);
  const style: CSSProperties = {
    ...reset,
    display: "block",
    width: box.width,
    fontFamily: quoteFamily(system.font.family),
    fontOpticalSizing: "auto",
    fontWeight: system.font.titleWeight,
    fontSize: fit.size,
    lineHeight: system.lineHeight,
    color,
    whiteSpace: "pre-wrap",
    overflowWrap: "normal",
    wordBreak: "normal",
    visibility: ready ? "visible" : "hidden",
  };
  if (renderTitle) return renderTitle({ text, style, fit });
  return (
    <div data-og-ready={ready ? "true" : "false"} data-og-title="" style={style}>
      {text}
    </div>
  );
}

function frameRoot(system: System, background: string): CSSProperties {
  return {
    ...reset,
    position: "relative",
    display: "flex",
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: "hidden",
    background,
    fontFamily: quoteFamily(system.font.family),
    fontOpticalSizing: "auto",
  };
}

function TextColumn({
  system,
  width,
  padding,
  titleWidth,
  ink,
  label,
  title,
  renderTitle,
}: {
  system: System;
  width: number;
  padding: string;
  titleWidth: number;
  ink: string;
  label: string;
  title: string;
  renderTitle?: (slot: TitleSlot) => ReactNode;
}) {
  const box = { width: titleWidth, height: titleHeight(system) };
  return (
    <div
      style={{
        ...reset,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: "none",
        width,
        height: FRAME_HEIGHT,
        padding,
      }}
    >
      <div
        style={{
          ...reset,
          flex: "none",
          fontFamily: quoteFamily(system.font.family),
          fontOpticalSizing: "auto",
          fontWeight: system.font.labelWeight,
          fontSize: system.labelSize,
          lineHeight: system.labelLineHeight,
          color: label,
          whiteSpace: "nowrap",
        }}
      >
        {system.domain}
      </div>
      <div style={{ ...reset, flexGrow: 1 }} />
      <FittedTitle box={box} color={ink} renderTitle={renderTitle} system={system} text={title} />
    </div>
  );
}

function coverStyle(source: ImageSource, width: number, height: number): CSSProperties {
  const zoom = source.zoom ?? 1;
  const position = `${source.focus.x * 100}% ${source.focus.y * 100}%`;
  return {
    ...reset,
    display: "block",
    width,
    height,
    maxWidth: "none",
    maxHeight: "none",
    objectFit: "cover",
    objectPosition: position,
    transformOrigin: position,
    transform: zoom === 1 ? "none" : `scale(${zoom})`,
  };
}

function SheetTiles({ image, width, height }: { image: { sheet: string[]; columns: number }; width: number; height: number }) {
  const cols = Math.max(1, image.columns);
  const rows = Math.ceil(image.sheet.length / cols);
  const tileWidth = Math.floor(width / cols);
  const tileHeight = Math.floor(height / rows);
  return (
    <>
      {image.sheet.map((src, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const w = col === cols - 1 ? width - tileWidth * (cols - 1) : tileWidth;
        const h = row === rows - 1 ? height - tileHeight * (rows - 1) : tileHeight;
        return (
          <PlainImage
            key={`${src}-${index}`}
            src={publicUrlForSource(src)}
            style={{
              ...reset,
              position: "absolute",
              left: col * tileWidth,
              top: row * tileHeight,
              display: "block",
              width: w,
              height: h,
              maxWidth: "none",
              maxHeight: "none",
              objectFit: "cover",
            }}
          />
        );
      })}
    </>
  );
}

function Panel({
  box,
  system,
  image,
  absolute,
  radius,
}: {
  box: ImageBox;
  system: System;
  image: EntryImage;
  absolute?: boolean;
  radius?: number;
}) {
  return (
    <div
      data-og-panel=""
      style={{
        ...reset,
        position: absolute ? "absolute" : "relative",
        left: absolute ? box.x : undefined,
        top: absolute ? box.y : undefined,
        flex: "none",
        width: box.width,
        height: box.height,
        overflow: "hidden",
        background: system.colors.panel,
        borderRadius: radius,
      }}
    >
      {image && isSheet(image) ? (
        <SheetTiles height={box.height} image={image} width={box.width} />
      ) : null}
      {image && isSource(image) ? (
        <PlainImage src={publicUrlForSource(image.src)} style={coverStyle(image, box.width, box.height)} />
      ) : null}
    </div>
  );
}

export type FrameProps = {
  entry: Entry;
  system: System;
  renderTitle?: (slot: TitleSlot) => ReactNode;
};

function platePadding(system: System, withImage: boolean): { width: number; padding: string; titleWidth: number } {
  if (!withImage) {
    return {
      width: FRAME_WIDTH,
      padding: `${system.margin}px ${system.margin}px ${system.textBottom}px ${system.margin}px`,
      titleWidth: FRAME_WIDTH - system.margin * 2,
    };
  }
  const width = FRAME_WIDTH - system.panelWidth;
  return {
    width,
    padding: `${system.margin}px ${system.panelGap}px ${system.textBottom}px ${system.margin}px`,
    titleWidth: width - system.panelGap - system.margin,
  };
}

function Plate({ entry, system, renderTitle }: FrameProps) {
  const colors = system.colors[entry.theme];
  const image = showsDrawnImage(entry) ? entry.image : null;
  const column = platePadding(system, image != null);
  return (
    <div data-og-frame="" style={frameRoot(system, colors.background)}>
      <TextColumn
        ink={colors.ink}
        label={colors.label}
        padding={column.padding}
        renderTitle={renderTitle}
        system={system}
        title={entry.title}
        titleWidth={column.titleWidth}
        width={column.width}
      />
      {image ? (
        <Panel
          box={{ x: FRAME_WIDTH - system.panelWidth, y: 0, width: system.panelWidth, height: FRAME_HEIGHT }}
          image={image}
          system={system}
        />
      ) : null}
    </div>
  );
}

function hexChannels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function linearize(channel: number): number {
  const c = channel / 255;
  if (c <= 0.04045) return c / 12.92;
  return ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = hexChannels(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(a: string, b: string): number {
  const left = luminance(a);
  const right = luminance(b);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixChannel(ink: string, background: string, amount: number): string {
  const [ir, ig, ib] = hexChannels(ink);
  const [br, bg, bb] = hexChannels(background);
  const mix = (from: number, to: number) => Math.round(from * amount + to * (1 - amount));
  const channels = [mix(ir, br), mix(ig, bg), mix(ib, bb)];
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function posterInk(system: System, background: string): { ink: string; label: string } {
  const lightInk = system.colors.dark.ink;
  const darkInk = system.colors.light.ink;
  const ink = contrastRatio(lightInk, background) >= contrastRatio(darkInk, background) ? lightInk : darkInk;
  const mixed = mixChannel(ink, background, ink === lightInk ? 0.72 : 0.6);
  const label = contrastRatio(mixed, background) >= 4.5 ? mixed : ink;
  return { ink, label };
}

function posterBackground(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#000000";
}

function Poster({ entry, system, renderTitle }: FrameProps) {
  const background = posterBackground(system.color);
  const { ink, label } = posterInk(system, background);
  const column = platePadding(system, false);
  return (
    <div data-og-frame="" style={frameRoot(system, background)}>
      <TextColumn
        ink={ink}
        label={label}
        padding={column.padding}
        renderTitle={renderTitle}
        system={system}
        title={entry.title}
        titleWidth={column.titleWidth}
        width={column.width}
      />
    </div>
  );
}

function insetCard(system: System): ImageBox {
  const height = FRAME_HEIGHT - 2 * system.margin;
  const width = Math.round((height * system.panelWidth) / FRAME_HEIGHT);
  return {
    x: FRAME_WIDTH - system.margin - width,
    y: system.margin,
    width,
    height,
  };
}

function Inset({ entry, system, renderTitle }: FrameProps) {
  const colors = system.colors[entry.theme];
  const image = showsDrawnImage(entry) ? entry.image : null;
  if (!image) {
    const column = platePadding(system, false);
    return (
      <div data-og-frame="" style={frameRoot(system, colors.background)}>
        <TextColumn
          ink={colors.ink}
          label={colors.label}
          padding={column.padding}
          renderTitle={renderTitle}
          system={system}
          title={entry.title}
          titleWidth={column.titleWidth}
          width={column.width}
        />
      </div>
    );
  }
  const card = insetCard(system);
  return (
    <div data-og-frame="" style={frameRoot(system, colors.background)}>
      <TextColumn
        ink={colors.ink}
        label={colors.label}
        padding={`${system.margin}px ${system.panelGap}px ${system.textBottom}px ${system.margin}px`}
        renderTitle={renderTitle}
        system={system}
        title={entry.title}
        titleWidth={card.x - system.panelGap - system.margin}
        width={card.x}
      />
      <Panel absolute box={card} image={image} radius={24} system={system} />
    </div>
  );
}

function ImageOnly({ entry, system }: FrameProps) {
  const box: ImageBox = { x: 0, y: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT };
  return (
    <div data-og-frame="" style={frameRoot(system, system.colors.panel)}>
      {entry.image ? <Panel box={box} image={entry.image} system={system} /> : null}
    </div>
  );
}

type TemplateDef = {
  label: string;
  uses: TemplateUses;
  titleBox: (entry: Entry, system: System) => Box;
  imageBox: (entry: Entry, system: System) => ImageBox | null;
  Frame: (props: FrameProps) => ReactNode;
};

function plateTitleBox(entry: Entry, system: System): Box {
  const height = titleHeight(system);
  if (!showsDrawnImage(entry)) return { width: FRAME_WIDTH - system.margin * 2, height };
  const textWidth = FRAME_WIDTH - system.panelWidth;
  return { width: textWidth - system.panelGap - system.margin, height };
}

function plateImageBox(entry: Entry, system: System): ImageBox | null {
  if (!showsDrawnImage(entry)) return null;
  return { x: FRAME_WIDTH - system.panelWidth, y: 0, width: system.panelWidth, height: FRAME_HEIGHT };
}

export const TEMPLATES: Record<TemplateName, TemplateDef> = {
  plate: {
    label: "Plate",
    uses: { theme: true, image: true, color: false },
    titleBox: plateTitleBox,
    imageBox: plateImageBox,
    Frame: Plate,
  },
  poster: {
    label: "Poster",
    uses: { theme: false, image: false, color: true },
    titleBox: (_entry, system) => ({ width: FRAME_WIDTH - system.margin * 2, height: titleHeight(system) }),
    imageBox: () => null,
    Frame: Poster,
  },
  inset: {
    label: "Inset",
    uses: { theme: true, image: true, color: false },
    titleBox: (entry, system) => {
      if (!showsDrawnImage(entry)) return plateTitleBox(entry, system);
      const card = insetCard(system);
      return { width: card.x - system.panelGap - system.margin, height: titleHeight(system) };
    },
    imageBox: (entry, system) => (showsDrawnImage(entry) ? insetCard(system) : null),
    Frame: Inset,
  },
};

export { DEFAULT_TEMPLATE };

export function resolveTemplateName(name: string): TemplateName {
  return isTemplateName(name) ? name : DEFAULT_TEMPLATE;
}

export function templateTitleBox(entry: Entry, system: System, template: string): Box | null {
  if (resolveLayout(entry) === "image-only") return null;
  return TEMPLATES[resolveTemplateName(template)].titleBox(entry, system);
}

export function templateImageBox(entry: Entry, system: System, template: string): ImageBox | null {
  if (resolveLayout(entry) === "image-only") {
    if (!entry.image) return null;
    return { x: 0, y: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT };
  }
  return TEMPLATES[resolveTemplateName(template)].imageBox(entry, system);
}

export function OgFrame({
  entry,
  system,
  template,
  renderTitle,
}: FrameProps & { template: string }) {
  if (resolveLayout(entry) === "image-only") {
    return <ImageOnly entry={entry} system={system} />;
  }
  const Frame = TEMPLATES[resolveTemplateName(template)].Frame;
  return <Frame entry={entry} renderTitle={renderTitle} system={system} />;
}
