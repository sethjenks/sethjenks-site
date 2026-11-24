"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pngForSave } from "./capture";
import { formatMegabytes, IMAGE_LIMIT, isMp4, VIDEO_LIMIT } from "./format";
import {
  applyVideo,
  commit,
  defaultDraft,
  listPages,
  pageStatus,
  redo,
  replaceEntry,
  singleSource,
  snapOf,
  stampSave,
  undo,
  type Model,
  type PageStatus,
  type ToolData,
} from "./model";
import { publicUrlForSource, TOOL_PATH } from "./paths";
import { isPng } from "./png";
import { saveMethod } from "./save-method";
import { templateUses } from "./template-names";
import { OgFrame } from "./templates";
import type { Entry, EntryVideo, ImageSheet, Layout, SourceFile, System } from "./types";
import { isSheet, isSource, resolveLayout } from "./types";
import {
  copyText,
  loadSitemap,
  makePrompt,
  PageEditor,
  pickerOptions,
  postJson,
  ScaledFrame,
  StatusDot,
  TemplateGallery,
  type PickerOption,
} from "./tool-parts";
import "./tool.css";

function initialModel(data: ToolData): Model {
  return {
    view: "all",
    entries: data.manifest.entries,
    template: data.manifest.system.template,
    color: data.manifest.system.color,
    past: [],
    future: [],
    saved: data.manifest.entries,
    files: data.files,
  };
}

function isTextField(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return ["text", "search", "url", "tel", "email", "password", "number"].includes(target.type);
}

export function LinkPreviewsTool({ data }: { data: ToolData }) {
  const [model, setModel] = useState<Model>(() => initialModel(data));
  const [sources, setSources] = useState<SourceFile[]>(data.sources);
  const [sitemap, setSitemap] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [batchNote, setBatchNote] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("PNG, JPEG or WebP, up to 10 MB");
  const [drop, setDrop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<Layout | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const modelRef = useRef(model);
  useEffect(() => {
    modelRef.current = model;
  });

  const sheets = useMemo(() => {
    const map: Record<string, ImageSheet> = {};
    for (const entry of data.manifest.entries) {
      if (isSheet(entry.image)) map[entry.id] = entry.image;
    }
    return map;
  }, [data.manifest.entries]);

  const system: System = useMemo(
    () => ({ ...data.manifest.system, template: model.template, color: model.color }),
    [data.manifest.system, model.color, model.template],
  );
  const listed = useMemo(() => listPages(model.entries, sitemap), [model.entries, sitemap]);
  const view = listed.pages.some((page) => page.path === model.view) || model.view === "all" || model.view === "template" ? model.view : "all";
  const current = listed.pages.find((page) => page.path === view);

  useEffect(() => {
    let cancel = false;
    void loadSitemap().then((paths) => {
      if (!cancel) setSitemap(paths);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") event.stopPropagation();
      if (event.altKey || isTextField(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        setModel((item) => undo(item, sitemap));
      } else if ((key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        setModel((item) => redo(item, sitemap));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [sitemap]);

  const update = useCallback((recipe: (snap: ReturnType<typeof snapOf>) => ReturnType<typeof snapOf>, key: string, merge: boolean) => {
    setModel((item) => commit(item, recipe(snapOf(item)), key, merge));
  }, []);

  const editEntry = useCallback((path: string, recipe: (entry: Entry) => Entry, key: string, merge: boolean) => {
    update((snap) => {
      const existing = snap.entries.find((entry) => entry.path === path);
      const base = existing ?? defaultDraft(path, snap.entries);
      return { ...snap, entries: replaceEntry(snap.entries, recipe(base)) };
    }, key, merge);
  }, [update]);

  function statusFor(page: (typeof listed.pages)[number]): PageStatus {
    const saved = model.saved.find((entry) => entry.path === page.path);
    const draft = page.stored ? page.entry : null;
    const exists = saved ? model.files[saved.id]?.imageBytes != null : false;
    return pageStatus(draft, saved, exists, system);
  }

  const needs = listed.pages.filter((page) => statusFor(page) !== "saved");

  async function pngFor(entry: Entry): Promise<string> {
    const layout = resolveLayout(entry);
    const live = modelRef.current;
    if (layout === "image-only" && entry.image && isSource(entry.image)) {
      const url = publicUrlForSource(entry.image.src);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load ${entry.image.src}.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const bitmap = await createImageBitmap(new Blob([bytes]));
      const method = saveMethod({
        width: bitmap.width,
        height: bitmap.height,
        zoom: entry.image.zoom,
        sheet: false,
        layout,
        png: isPng(bytes),
      });
      bitmap.close();
      return pngForSave({
        entry,
        system: { ...data.manifest.system, template: live.template, color: live.color },
        template: live.template,
        method,
        sourceUrl: url,
      });
    }
    return pngForSave({
      entry,
      system: { ...data.manifest.system, template: live.template, color: live.color },
      template: live.template,
      method: "capture",
    });
  }

  async function saveEntry(entry: Entry): Promise<string | null> {
    const sent = JSON.stringify(entry);
    let png: string;
    try {
      png = await pngFor(entry);
    } catch (error) {
      return error instanceof Error ? error.message : "The image could not be saved. Your draft is still here; try again.";
    }
    const result = await postJson(`${TOOL_PATH}/save`, {
      entry,
      png,
      template: modelRef.current.template,
      color: modelRef.current.color,
    });
    if (!result.ok) return result.error;
    const stored = result.data.entry as Entry;
    const bytes = typeof result.data.bytes === "number" ? result.data.bytes : 0;
    const live = modelRef.current.entries.find((item) => item.id === entry.id);
    setModel((item) => stampSave(item, stored, bytes, !live || JSON.stringify(live) !== sent));
    return null;
  }

  async function saveCurrent() {
    if (!current || saving) return;
    const entry = current.stored ? current.entry : defaultDraft(current.path, modelRef.current.entries);
    setSaving("one");
    const error = await saveEntry(entry);
    setSaving(null);
    setFailures((items) => ({ ...items, [current.path]: error ?? "" }));
  }

  async function saveAll() {
    if (saving) return;
    const queue = listed.pages.filter((page) => statusFor(page) !== "saved");
    const reasons: string[] = [];
    for (let index = 0; index < queue.length; index += 1) {
      const page = queue[index];
      if (!page) continue;
      setSaving(`${index + 1}/${queue.length}`);
      const live = modelRef.current.entries.find((entry) => entry.path === page.path) ?? page.entry;
      const error = await saveEntry(live);
      if (error) reasons.push(error);
      setFailures((items) => ({ ...items, [page.path]: error ?? "" }));
    }
    setSaving(null);
    setBatchNote(reasons.length ? `${reasons.length} of ${queue.length} couldn’t be saved: ${reasons[0]}` : "");
  }

  function chooseSource(entry: Entry, option: PickerOption) {
    const usesImage = templateUses(model.template).image;
    const layout = pendingLayout ?? (resolveLayout(entry) === "type-only" ? (usesImage ? "type-and-image" : "image-only") : resolveLayout(entry));
    if (option.sheet) {
      if (isSheet(entry.image) && !pendingLayout) {
        setPendingLayout(null);
        return;
      }
      editEntry(entry.path, (item) => ({ ...item, layout, image: option.sheet ?? null }), `source:${entry.id}`, false);
    } else if (option.src) {
      if (isSource(entry.image) && entry.image.src === option.src && !pendingLayout) return;
      editEntry(entry.path, (item) => ({ ...item, layout, image: singleSource(option.src as string) }), `source:${entry.id}`, false);
    }
    setPendingLayout(null);
  }

  async function uploadFile(entry: Entry, file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadMessage("Upload a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > IMAGE_LIMIT) {
      setUploadMessage("Images can be up to 10 MB.");
      return;
    }
    setUploading(true);
    setNotes((items) => ({ ...items, [entry.path]: "Uploading…" }));
    const dataUrl = await readDataUrl(file);
    const result = await postJson(`${TOOL_PATH}/upload`, { name: file.name, data: dataUrl });
    setUploading(false);
    if (!result.ok) {
      setUploadMessage(result.error);
      setNotes((items) => ({ ...items, [entry.path]: result.error }));
      return;
    }
    const source = result.data.source as SourceFile;
    setSources((items) => (items.some((item) => item.src === source.src) ? items : [...items, source]));
    chooseSource(entry, { key: source.src, label: source.label, src: source.src });
    setNotes((items) => ({ ...items, [entry.path]: "" }));
    setUploadMessage("PNG, JPEG or WebP, up to 10 MB");
  }

  async function onDropFiles(page: (typeof listed.pages)[number], files: FileList) {
    const list = [...files];
    const saved = model.saved.some((item) => item.path === page.path);
    const video = list.find((file) => file.type.startsWith("video/") || /\.(mp4|m4v|mov|webm)$/i.test(file.name));
    const canImage = templateUses(model.template).image || resolveLayout(page.entry) === "image-only";
    if (video) {
      if (!saved) {
        setNotes((items) => ({ ...items, [page.path]: "Save this page’s image before adding a video." }));
        return;
      }
      await sendVideo(page, video);
      return;
    }
    const image = list.find((file) => /image\/(png|jpeg|webp)/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name));
    if (image && canImage) {
      await uploadFile(page.entry, image);
      return;
    }
    const message = !canImage
      ? "Drop an MP4 video."
      : saved
        ? "Drop a PNG, JPEG or WebP image, or an MP4 video."
        : "Drop a PNG, JPEG or WebP image. A video can be added once this page’s image is saved.";
    setNotes((items) => ({ ...items, [page.path]: message }));
  }

  async function sendVideo(page: (typeof listed.pages)[number], file: File) {
    const savedEntry = modelRef.current.saved.find((item) => item.path === page.path);
    if (!savedEntry) {
      setNotes((items) => ({ ...items, [page.path]: "Save this page’s image before adding a video." }));
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isMp4(bytes)) {
      setNotes((items) => ({ ...items, [page.path]: "That isn’t an MP4 video. Export it as MP4 (H.264) and try again." }));
      return;
    }
    if (file.size > VIDEO_LIMIT) {
      setNotes((items) => ({ ...items, [page.path]: `Videos can be up to 8.4 MB. This one is ${formatMegabytes(file.size)}.` }));
      return;
    }
    setVideoBusy(true);
    setNotes((items) => ({ ...items, [page.path]: "Uploading the video…" }));
    const size = await readVideoSize(file);
    if (!size) {
      setVideoBusy(false);
      setNotes((items) => ({ ...items, [page.path]: "This browser can’t read that video." }));
      return;
    }
    if (!size.width || !size.height) {
      setVideoBusy(false);
      setNotes((items) => ({ ...items, [page.path]: "This video has no picture." }));
      return;
    }
    try {
      const response = await fetch(`${TOOL_PATH}/video?id=${encodeURIComponent(savedEntry.id)}&width=${size.width}&height=${size.height}`, {
        method: "POST",
        headers: { "content-type": "video/mp4", "x-link-previews": "1" },
        body: bytes,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; video?: EntryVideo; bytes?: number };
      if (!response.ok || !payload.video) {
        setNotes((items) => ({ ...items, [page.path]: payload.error || "The video could not be saved. Try again." }));
      } else {
        setModel((item) => applyVideo(item, savedEntry.id, payload.video, payload.bytes ?? file.size));
        setNotes((items) => ({ ...items, [page.path]: "" }));
      }
    } catch {
      setNotes((items) => ({ ...items, [page.path]: "The video could not be saved. Try again." }));
    }
    setVideoBusy(false);
  }

  async function removeVideo(entry: Entry) {
    setVideoBusy(true);
    const result = await postJson(`${TOOL_PATH}/video`, { id: entry.id, remove: true });
    setVideoBusy(false);
    if (!result.ok) {
      setNotes((items) => ({ ...items, [entry.path]: result.error || "The video could not be removed. Try again." }));
      return;
    }
    const kept = typeof result.data.kept === "string" ? result.data.kept : entry.video?.src;
    setModel((item) => applyVideo(item, entry.id, undefined, null));
    setNotes((items) => ({ ...items, [entry.path]: kept ? `Video removed. The file is still at ${kept}.` : "" }));
  }

  const headerName = view === "all" ? "All" : view === "template" ? "Template" : view;
  const showSave = Boolean(current && statusFor(current) !== "saved");
  const note = view === "all" || view === "template" ? batchNote : current ? failures[current.path] : "";

  return (
    <div className="lp">
      <aside className="lp-sidebar">
        <nav aria-label="Link previews" className="lp-nav">
          <button aria-current={view === "all" ? "page" : undefined} className="lp-row" onClick={() => setModel((item) => ({ ...item, view: "all" }))} type="button">
            <span className="lp-row-label">All</span>
          </button>
          <button aria-current={view === "template" ? "page" : undefined} className="lp-row" onClick={() => setModel((item) => ({ ...item, view: "template" }))} type="button">
            <span className="lp-row-label">Template</span>
          </button>
          {listed.groups.map((group) => (
            <div key={group}>
              {listed.groups.length > 1 ? <h2 className="lp-group">{group}</h2> : null}
              {listed.pages
                .filter((page) => page.entry.group === group)
                .map((page) => (
                  <button aria-current={view === page.path ? "page" : undefined} className="lp-row" key={page.path} onClick={() => setModel((item) => ({ ...item, view: page.path }))} type="button">
                    <span className="lp-row-label">{page.path}</span>
                    <StatusDot status={statusFor(page)} />
                  </button>
                ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="lp-canvas">
        <header className="lp-header">
          <h1>{headerName}</h1>
          <div className="lp-header-side">
            {note ? <p className="lp-note" role="status">{note}</p> : null}
            {view !== "all" && view !== "template" && showSave ? (
              <button className="lp-primary" disabled={Boolean(saving)} onClick={() => void saveCurrent()} type="button">
                {saving ? "Saving…" : "Save"}
              </button>
            ) : null}
            {(view === "all" || view === "template") && needs.length > 0 ? (
              <button className="lp-primary" disabled={Boolean(saving)} onClick={() => void saveAll()} type="button">
                {saving?.includes("/") ? `Saving ${saving.split("/")[0]} of ${saving.split("/")[1]}…` : "Save all"}
              </button>
            ) : null}
          </div>
        </header>
        <div className="lp-content">
          {view === "all" ? (
            <div className="lp-grid">
              {listed.pages.map((page) => (
                <figure className="lp-card" key={page.path}>
                  <ScaledFrame>
                    <OgFrame entry={page.entry} system={system} template={model.template} />
                  </ScaledFrame>
                  <figcaption className="lp-caption">
                    <span className="lp-caption-label">{page.path}</span>
                    {page.entry.video ? <span>Video</span> : null}
                    <StatusDot status={statusFor(page)} />
                  </figcaption>
                  <button className="lp-hit" onClick={() => setModel((item) => ({ ...item, view: page.path }))} type="button">
                    <span className="lp-sr">Edit {page.path}</span>
                  </button>
                </figure>
              ))}
            </div>
          ) : null}
          {view === "template" ? (
            <TemplateGallery
              color={model.color}
              copied={copied}
              onColor={(color) => update((snap) => ({ ...snap, color }), "color", true)}
              onCopy={() => {
                void copyText(makePrompt(data.registryPath)).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
              onTemplate={(template) => update((snap) => ({ ...snap, template }), `template:${template}`, false)}
              pages={listed.pages}
              registryPath={data.registryPath}
              system={system}
              template={model.template}
            />
          ) : null}
          {current ? (
            <PageEditor
              busyVideo={videoBusy}
              drop={drop}
              entry={current.entry}
              file={model.files[current.entry.id] ?? { imageBytes: null, videoBytes: null }}
              note={notes[current.path] ?? ""}
              onCrop={(focus, key) =>
                editEntry(
                  current.path,
                  (entry) => (isSource(entry.image) ? { ...entry, image: { ...entry.image, focus } } : entry),
                  key.startsWith("nudge") ? `nudge:${current.entry.id}` : key,
                  true,
                )
              }
              onDropFiles={(files) => void onDropFiles(current, files)}
              onLayout={(layout) => {
                const next = layout as Layout;
                const original = sheets[current.entry.id];
                if (next !== "type-only" && !current.entry.image && !original && sources[0] == null) {
                  setPendingLayout(next);
                  return;
                }
                const image = next === "type-only" ? current.entry.image : current.entry.image ?? original ?? (sources[0] ? singleSource(sources[0].src) : null);
                editEntry(current.path, (entry) => ({ ...entry, layout: next, image }), `layout:${current.entry.id}`, false);
                setPendingLayout(null);
              }}
              onRemoveVideo={() => void removeVideo(current.entry)}
              onSource={(option) => chooseSource(current.entry, option)}
              onTheme={(theme) => editEntry(current.path, (entry) => ({ ...entry, theme: theme === "dark" ? "dark" : "light" }), `theme:${current.entry.id}`, false)}
              onTitle={(title) => editEntry(current.path, (entry) => ({ ...entry, title }), `title:${current.entry.id}:${countBreaks(title)}`, true)}
              onUpload={(file) => void uploadFile(current.entry, file)}
              options={pickerOptions(current.entry, sources, model.entries, sheets[current.entry.id])}
              pending={pendingLayout != null}
              saved={model.saved.some((item) => item.path === current.path)}
              setDrop={setDrop}
              system={system}
              template={model.template}
              uploadBusy={uploading}
              uploadMessage={uploadMessage}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function countBreaks(value: string): number {
  return value.split("\n").length - 1;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readVideoSize(file: File): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
