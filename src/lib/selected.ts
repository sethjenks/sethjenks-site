import selectedFile from "../../content/selected.json";

export const SELECTED_MARKS = ["chia", "philo", "field"] as const;

export type SelectedMark = (typeof SELECTED_MARKS)[number];

export type SelectedWork = {
  id: string;
  mark: SelectedMark;
  name: string;
  headline: string;
  caption: string;
  alt: string;
  placeholder?: boolean;
  src?: string;
  width?: number;
  height?: number;
  href?: string;
  cta?: string;
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SELECTED_WORK = parseSelected(selectedFile);

function parseSelected(value: unknown): SelectedWork[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("content/selected.json must be a non-empty array.");
  }

  return value.map((item, index) => parseItem(item, index));
}

function parseItem(value: unknown, index: number): SelectedWork {
  if (!isRecord(value)) {
    throw new Error(`content/selected.json[${index}] must be an object.`);
  }

  const href = value.href;
  if (
    href !== undefined &&
    (typeof href !== "string" || (!href.startsWith("/") && !/^https?:\/\//.test(href)))
  ) {
    throw new Error(`content/selected.json[${index}].href must be a site path or http(s) URL.`);
  }

  const cta = value.cta;
  if (cta !== undefined && (typeof cta !== "string" || cta.trim().length === 0)) {
    throw new Error(`content/selected.json[${index}].cta must be a non-empty string.`);
  }

  if (value.placeholder !== undefined && typeof value.placeholder !== "boolean") {
    throw new Error(`content/selected.json[${index}].placeholder must be a boolean.`);
  }

  const placeholder = value.placeholder === true;
  const media = readMedia(value, index, placeholder);

  const id = readLine(value.id, index, "id");
  if (!ID_PATTERN.test(id)) {
    throw new Error(`content/selected.json[${index}].id must be a slug.`);
  }

  const mark = readLine(value.mark, index, "mark");
  if (!isSelectedMark(mark)) {
    throw new Error(
      `content/selected.json[${index}].mark must be ${SELECTED_MARKS.join(", ")}.`,
    );
  }

  return {
    id,
    mark,
    name: readLine(value.name, index, "name"),
    headline: readLine(value.headline, index, "headline"),
    caption: readLine(value.caption, index, "caption"),
    alt: media.alt,
    placeholder: placeholder || undefined,
    src: media.src,
    width: media.width,
    height: media.height,
    href,
    cta: typeof cta === "string" ? cta.trim() : undefined,
  };
}

function readMedia(value: Record<string, unknown>, index: number, placeholder: boolean) {
  const hasSrc = value.src !== undefined;
  if (!hasSrc && placeholder) {
    return { alt: "" };
  }

  if (!hasSrc) {
    throw new Error(`content/selected.json[${index}].src must start with /media/.`);
  }

  const src = readLine(value.src, index, "src");
  if (!src.startsWith("/media/")) {
    throw new Error(`content/selected.json[${index}].src must start with /media/.`);
  }

  const width = value.width;
  const height = value.height;
  if (typeof width !== "number" || width <= 0 || typeof height !== "number" || height <= 0) {
    throw new Error(`content/selected.json[${index}] width and height must be positive numbers.`);
  }

  return {
    src,
    width,
    height,
    alt: readLine(value.alt, index, "alt"),
  };
}

function readLine(value: unknown, index: number, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`content/selected.json[${index}].${field} must be a non-empty string.`);
  }

  return value.trim();
}

function isSelectedMark(value: string): value is SelectedMark {
  return (SELECTED_MARKS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
