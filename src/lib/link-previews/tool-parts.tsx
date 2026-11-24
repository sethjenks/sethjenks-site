"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { formatMegabytes, MESSAGES_LIMIT } from "./format";
import { publicUrlForSource } from "./paths";
import { loadFrameFonts, fitTitleText, OgFrame, PlainImage, TEMPLATES, templateImageBox, templateTitleBox, type TitleSlot } from "./templates";
import { templateUses } from "./template-names";
import type { Entry, EntryVideo, ImageSheet, SourceFile, System } from "./types";
import { imageSources, isSheet, isSource, resolveLayout } from "./types";
import type { FileInfo } from "./model";

export const PROMPT_SLOT = "[Describe it: where the title and image go, the colors, the type, anything else.]";
export const TITLE_OVERFLOW = "The title doesn’t fit, even at 40px. Shorten it or break it differently.";

export function makePrompt(registryPath: string): string {
  const where = registryPath || "the file that defines the share image templates";
  return `I want a new share image template for this site.\n\nWhat I want: ${PROMPT_SLOT}\n\nRead the comment at the top of ${where} first. It explains how templates work and the rules to keep. Add mine there as a new template, and don't change the existing ones. It will appear in the Template gallery of the Link Previews tool.`;
}

export function Chevron() {
  return (
    <svg aria-hidden="true" className="lp-chevron" fill="none" height="12" viewBox="0 0 12 12" width="12">
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

export function StatusDot({ status }: { status: "draft" | "stale" | "missing" | "saved" }) {
  if (status === "saved") return null;
  const label = status === "draft" ? "Draft" : status === "stale" ? "Stale" : "Missing";
  return <span aria-label={label} className={`lp-dot lp-dot-${status}`} role="img" title={label} />;
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState({ x: 0, w: 0 });
  const [ready, setReady] = useState(false);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const place = useCallback(() => {
    const button = refs.current[index];
    if (!button) return;
    setThumb({ x: button.offsetLeft, w: button.offsetWidth });
  }, [index]);

  useLayoutEffect(() => {
    place();
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [place]);

  useEffect(() => {
    const parent = refs.current[index]?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(place);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [index, place]);

  function onKeyDown(event: KeyboardEvent) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const next = (index + direction + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div aria-label={label} className="lp-segment" onKeyDown={onKeyDown} role="radiogroup">
      <span className={ready ? "lp-thumb is-ready" : "lp-thumb"} style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }} />
      {options.map((option, optionIndex) => (
        <button
          aria-checked={option.value === value}
          className="lp-segment-option"
          key={option.value}
          onClick={() => onChange(option.value)}
          ref={(node) => {
            refs.current[optionIndex] = node;
          }}
          role="radio"
          tabIndex={option.value === value ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ScaledFrame({ children, current = false, drop = false }: { children: ReactNode; current?: boolean; drop?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / 1200);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={`lp-scale${current ? " is-current" : ""}${drop ? " is-drop" : ""}`} ref={box}>
      <div
        className="lp-layer"
        style={{
          visibility: scale ? "visible" : "hidden",
          transform: `scale(${scale || 1})`,
          ["--frame-scale" as string]: String(scale || 1),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function readTitle(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  if (clone.lastChild?.nodeName === "BR") clone.lastChild.remove();
  return (clone.textContent ?? "").replace(/\u00a0/g, " ");
}

function writeTitle(node: HTMLElement, value: string) {
  node.textContent = value;
  if (value.endsWith("\n")) node.appendChild(document.createElement("br"));
}

function placeCaret(node: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function EditableTitle({ text, style, onChange }: { text: string; style: CSSProperties; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || readTitle(node) === text) return;
    writeTitle(node, text);
    if (document.activeElement === node) placeCaret(node);
  }, [text]);

  return (
    <div
      aria-label="Title"
      aria-multiline="true"
      className="lp-title-edit"
      contentEditable="plaintext-only"
      onDrop={(event) => event.preventDefault()}
      onInput={(event) => {
        const node = event.currentTarget;
        const value = readTitle(node);
        if (value.endsWith("\n") && node.lastChild?.nodeName !== "BR") node.appendChild(document.createElement("br"));
        if (!value.endsWith("\n") && node.lastChild?.nodeName === "BR") node.lastChild.remove();
        onChange(value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        document.execCommand("insertText", false, "\n");
      }}
      onPaste={(event) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\u00a0/g, " ");
        document.execCommand("insertText", false, pasted);
      }}
      ref={ref}
      role="textbox"
      spellCheck={false}
      style={style}
      suppressContentEditableWarning
      tabIndex={0}
    />
  );
}

export function CropTarget({
  box,
  source,
  onFocus,
}: {
  box: { x: number; y: number; width: number; height: number };
  source: { src: string; focus: { x: number; y: number }; zoom?: number };
  onFocus: (focus: { x: number; y: number }, key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; focus: { x: number; y: number }; key: string } | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = publicUrlForSource(source.src);
  }, [source.src]);

  function move(dx: number, dy: number, key: string, origin: { x: number; y: number }) {
    if (!natural.width || !natural.height) return;
    const node = ref.current;
    const scale = node && box.width ? node.clientWidth / box.width : 1;
    const zoom = source.zoom ?? 1;
    const cover = Math.max(box.width / natural.width, box.height / natural.height) * zoom;
    const slackX = natural.width * cover - box.width;
    const slackY = natural.height * cover - box.height;
    const next = { ...origin };
    if (slackX > 0.5) next.x = clamp(origin.x - dx / scale / slackX);
    if (slackY > 0.5) next.y = clamp(origin.y - dy / scale / slackY);
    if (next.x === source.focus.x && next.y === source.focus.y) return;
    onFocus(next, key);
  }

  return (
    <div
      aria-label="Image crop. Drag or use the arrow keys to move the image."
      className="lp-crop"
      data-dragging={dragging ? "" : undefined}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 50 : 10;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        if (!dx && !dy) return;
        event.preventDefault();
        const node = ref.current;
        const scale = node && box.width ? node.clientWidth / box.width : 1;
        move(dx * scale, dy * scale, `nudge:${source.src}`, source.focus);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
        drag.current = { x: event.clientX, y: event.clientY, focus: source.focus, key: `crop:${source.src}:${Date.now()}` };
        setDragging(true);
      }}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        const start = drag.current;
        if (!start) return;
        move(event.clientX - start.x, event.clientY - start.y, start.key, start.focus);
      }}
      onPointerUp={() => {
        drag.current = null;
        setDragging(false);
      }}
      ref={ref}
      role="group"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      tabIndex={0}
    />
  );
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

export type PickerOption = { key: string; label: string; src: string | null; sheet?: ImageSheet };

export function pickerOptions(entry: Entry, sources: SourceFile[], entries: Entry[], sheet: ImageSheet | undefined): PickerOption[] {
  const options: PickerOption[] = [];
  if (sheet) options.push({ key: `sheet:${entry.id}`, label: `Sheet of ${sheet.sheet.length}`, src: sheet.sheet[0] ?? null, sheet });
  const seen = new Set<string>();
  for (const source of sources) {
    seen.add(source.src);
    options.push({ key: source.src, label: source.label, src: source.src });
  }
  for (const item of entries) {
    for (const src of imageSources(item.image)) {
      if (seen.has(src) || !/\.(png|jpe?g|webp)$/i.test(src)) continue;
      seen.add(src);
      options.push({ key: src, label: src.split("/").pop() ?? src, src });
    }
  }
  return options;
}

export function ImagePicker({
  entry,
  options,
  busy,
  message,
  onChoose,
  onUpload,
}: {
  entry: Entry;
  options: PickerOption[];
  busy: boolean;
  message: string;
  onChoose: (option: PickerOption) => void;
  onUpload: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const file = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => (option.sheet ? isSheet(entry.image) : isSource(entry.image) && option.src === entry.image.src));
  const name = selected?.label ?? "Choose image";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedOption = root.current?.querySelector<HTMLButtonElement>("[aria-selected='true']");
    (selectedOption ?? root.current?.querySelector<HTMLButtonElement>("[role='option']"))?.focus();
  }, [open]);

  return (
    <div className="lp-picker" ref={root}>
      <button aria-expanded={open} aria-haspopup="listbox" aria-label={`Image source: ${name}`} className="lp-picker-button" onClick={() => setOpen((value) => !value)} type="button">
        {selected?.src ? <PlainImage className="lp-round" src={publicUrlForSource(selected.src)} style={{ width: 24, height: 24 }} /> : <span className="lp-round" />}
        <span className="lp-picker-name">{name}</span>
        <Chevron />
      </button>
      {open ? (
        <div className="lp-popover">
          <div aria-label="Image source" className="lp-options" id={listId} role="listbox">
            {options.map((option) => (
              <button
                aria-selected={option.key === selected?.key}
                className="lp-option"
                key={option.key}
                onClick={() => {
                  onChoose(option);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.src ? (
                  <PlainImage
                    src={publicUrlForSource(option.src)}
                    style={{ display: "block", width: "100%", maxWidth: "none", aspectRatio: "4 / 3", borderRadius: 8, objectFit: "cover", background: "var(--lp-canvas)", outline: "1px solid var(--lp-hairline)", outlineOffset: -1 }}
                  />
                ) : null}
                <span className="lp-option-name">{option.label}</span>
              </button>
            ))}
          </div>
          <div className="lp-popover-foot">
            <button className="lp-quiet" disabled={busy} onClick={() => file.current?.click()} type="button">
              {busy ? "Uploading…" : "Upload"}
            </button>
            <span>{message}</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              className="lp-sr"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                event.target.value = "";
                if (picked) onUpload(picked);
              }}
              ref={file}
              type="file"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageEditor(props: {
  entry: Entry;
  system: System;
  template: string;
  file: FileInfo;
  saved: boolean;
  options: PickerOption[];
  note: string;
  drop: boolean;
  pending: boolean;
  uploadBusy: boolean;
  uploadMessage: string;
  busyVideo: boolean;
  onTitle: (title: string) => void;
  onTheme: (theme: string) => void;
  onLayout: (layout: string) => void;
  onSource: (option: PickerOption) => void;
  onUpload: (file: File) => void;
  onCrop: (focus: { x: number; y: number }, key: string) => void;
  onDropFiles: (files: FileList) => void;
  setDrop: (drop: boolean) => void;
  onRemoveVideo: () => void;
}) {
  const { entry, system, template } = props;
  const uses = templateUses(template);
  const layout = resolveLayout(entry);
  const imageBox = templateImageBox(entry, system, template);
  const titleBox = templateTitleBox(entry, system, template);
  const boxWidth = titleBox?.width ?? -1;
  const boxHeight = titleBox?.height ?? -1;
  const [overflow, setOverflow] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const layoutOptions = uses.image
    ? [
        { value: "type-only", label: "Text" },
        { value: "type-and-image", label: "Text & Image" },
        { value: "image-only", label: "Image" },
      ]
    : [
        { value: "type-only", label: "Text" },
        { value: "image-only", label: "Image" },
      ];
  const layoutValue = !uses.image && layout !== "image-only" ? "type-only" : layout;
  const canImage = uses.image || layout === "image-only";

  useEffect(() => {
    if (boxWidth < 0 || layout === "image-only") return;
    let cancel = false;
    void loadFrameFonts(system).then(() => {
      if (!cancel) setOverflow(fitTitleText(entry.title, { width: boxWidth, height: boxHeight }, system).overflow);
    });
    return () => {
      cancel = true;
    };
  }, [boxHeight, boxWidth, entry.title, layout, system]);
  const titleOverflows = layout !== "image-only" && boxWidth >= 0 && overflow;

  const imageBytes = props.file.imageBytes ?? 0;
  const videoBytes = props.file.videoBytes ?? 0;
  const over = Boolean(entry.video && props.file.imageBytes != null && props.file.videoBytes != null && imageBytes + videoBytes > MESSAGES_LIMIT);

  return (
    <div className="lp-workspace">
      <div
        onDragEnter={(event: DragEvent) => {
          if (event.dataTransfer.types.includes("Files") && (canImage || props.saved)) props.setDrop(true);
        }}
        onDragLeave={() => props.setDrop(false)}
        onDragOver={(event: DragEvent) => {
          if (event.dataTransfer.types.includes("Files") && (canImage || props.saved)) event.preventDefault();
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          props.setDrop(false);
          if (event.dataTransfer.files.length) props.onDropFiles(event.dataTransfer.files);
        }}
      >
        <ScaledFrame drop={props.drop}>
          <OgFrame
            entry={entry}
            renderTitle={(slot: TitleSlot) => <EditableTitle onChange={props.onTitle} style={slot.style} text={slot.text} />}
            system={system}
            template={template}
          />
          {imageBox && isSource(entry.image) ? <CropTarget box={imageBox} onFocus={props.onCrop} source={entry.image} /> : null}
        </ScaledFrame>
      </div>
      <div className="lp-controls">
        {uses.theme && layout !== "image-only" ? (
          <Segmented label="Theme" onChange={props.onTheme} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} value={entry.theme} />
        ) : null}
        <Segmented label="Layout" onChange={props.onLayout} options={layoutOptions} value={layoutValue} />
        {layout !== "type-only" || props.pending ? (
          <ImagePicker busy={props.uploadBusy} entry={entry} message={props.uploadMessage} onChoose={props.onSource} onUpload={props.onUpload} options={props.options} />
        ) : null}
        {props.saved ? (
          entry.video ? (
            <>
              <button className="lp-quiet" disabled={props.busyVideo} onClick={() => input.current?.click()} type="button">Replace video</button>
              <button className="lp-quiet" disabled={props.busyVideo} onClick={props.onRemoveVideo} type="button">Remove video</button>
            </>
          ) : (
            <button className="lp-quiet" disabled={props.busyVideo} onClick={() => input.current?.click()} type="button">Add video</button>
          )
        ) : null}
        <input
          accept="video/mp4"
          aria-label="Video file"
          className="lp-sr"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = "";
            if (!picked) return;
            const transfer = new DataTransfer();
            transfer.items.add(picked);
            props.onDropFiles(transfer.files);
          }}
          ref={input}
          type="file"
        />
      </div>
      {titleOverflows || props.note ? (
        <div className="lp-status">
          {titleOverflows ? (
            <p className="lp-alert" role="alert">
              <span className="lp-dot lp-dot-stale" />
              {TITLE_OVERFLOW}
            </p>
          ) : null}
          {props.note ? <p role="status">{props.note}</p> : null}
        </div>
      ) : null}
      {entry.video ? (
        <div className="lp-video">
          <video aria-label="Video preview" autoPlay loop muted playsInline src={videoUrl(entry.video)} />
          <div className="lp-video-copy">
            <span className="lp-video-size">
              {props.file.videoBytes == null
                ? `File missing: ${entry.video.src}, ${entry.video.width}×${entry.video.height}`
                : `${formatMegabytes(props.file.videoBytes)}, ${entry.video.width}×${entry.video.height}`}
            </span>
            <span>Plays in Messages. Other apps show the image.</span>
            {over ? (
              <span className="lp-alert" role="alert">
                <span className="lp-dot lp-dot-stale" />
                The saved image and this video come to {formatMegabytes(imageBytes + videoBytes)}, over the 10 MB Messages loads for one link.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function videoUrl(video: EntryVideo): string {
  const path = video.src.startsWith("public/") ? `/${video.src.slice("public/".length)}` : `/${video.src}`;
  return video.version ? `${path}?v=${video.version}` : path;
}

export function TemplateGallery({
  pages,
  system,
  template,
  color,
  registryPath,
  copied,
  onTemplate,
  onColor,
  onCopy,
}: {
  pages: { entry: Entry }[];
  system: System;
  template: string;
  color: string;
  registryPath: string;
  copied: boolean;
  onTemplate: (template: string) => void;
  onColor: (color: string) => void;
  onCopy: () => void;
}) {
  const sample =
    pages.find((page) => resolveLayout(page.entry) === "type-and-image" && isSource(page.entry.image))?.entry ??
    pages[0]?.entry ?? {
      id: "sample",
      path: "/",
      title: "Your page title",
      group: "Pages",
      theme: "light" as const,
      image: null,
      version: null,
      savedHash: null,
    };
  const prompt = makePrompt(registryPath);
  const index = prompt.indexOf(PROMPT_SLOT);
  return (
    <div className="lp-gallery">
      {Object.entries(TEMPLATES).map(([name, item]) => {
        const current = name === template;
        return (
          <figure className="lp-card lp-template-card" key={name}>
            <ScaledFrame current={current}>
              <OgFrame entry={sample} system={{ ...system, template: name, color }} template={name} />
            </ScaledFrame>
            <figcaption className="lp-caption is-tall">
              <span className="lp-caption-label">{item.label}</span>
              <span className="lp-caption-meta">
                {item.uses.color ? (
                  <label className="lp-pill">
                    <span className="lp-swatch" style={{ background: color }} />
                    {color.toUpperCase()}
                    <Chevron />
                    <input aria-label={`${item.label} background color`} onChange={(event) => onColor(event.target.value)} type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"} />
                  </label>
                ) : null}
                {current ? <span className="lp-current">Current</span> : null}
              </span>
            </figcaption>
            <button aria-pressed={current} className="lp-hit" onClick={() => onTemplate(name)} type="button">
              <span className="lp-sr">{current ? `${item.label}, the current template` : `Use ${item.label} for every page`}</span>
            </button>
          </figure>
        );
      })}
      <figure className="lp-card">
        <div className="lp-prompt">
          <p>
            {prompt.slice(0, index)}
            <span className="lp-slot">{PROMPT_SLOT}</span>
            {prompt.slice(index + PROMPT_SLOT.length)}
          </p>
          <button className="lp-quiet" onClick={onCopy} style={{ alignSelf: "flex-start" }} type="button">
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
        <figcaption className="lp-caption">
          <span className="lp-caption-label">Make your own</span>
        </figcaption>
      </figure>
    </div>
  );
}

export async function postJson(url: string, body: unknown): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-link-previews": "1" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { ok: false, error: data.error || "The image could not be saved. Your draft is still here; try again." };
    return { ok: true, data: data as Record<string, unknown> };
  } catch {
    return { ok: false, error: "The image could not be saved. Your draft is still here; try again." };
  }
}

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

export async function loadSitemap(): Promise<string[]> {
  try {
    const response = await fetch("/sitemap.xml");
    if (!response.ok) return [];
    const xml = await response.text();
    if (xml.includes("<sitemapindex")) {
      const pages: string[] = [];
      for (const child of sitemapLocs(xml)) {
        const next = await fetch(child);
        if (next.ok) pages.push(...sitemapLocs(await next.text()));
      }
      return [...new Set(pages)];
    }
    return [...new Set(sitemapLocs(xml))];
  } catch {
    return [];
  }
}

function sitemapLocs(xml: string): string[] {
  const found: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const raw = (match[1] ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    try {
      const url = new URL(raw, window.location.origin);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
      found.push(pathname);
    } catch {
      continue;
    }
  }
  return found;
}
