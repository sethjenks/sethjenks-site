export type Theme = "light" | "dark";

export type Layout = "type-only" | "type-and-image" | "image-only";

export type Focus = { x: number; y: number };

export type ImageSource = {
  src: string;
  focus: Focus;
  zoom?: number;
};

export type ImageSheet = {
  sheet: string[];
  columns: number;
};

export type EntryImage = ImageSource | ImageSheet | null;

export type EntryVideo = {
  src: string;
  type: "video/mp4";
  width: number;
  height: number;
  version?: string;
};

export type Entry = {
  id: string;
  path: string;
  title: string;
  group: string;
  theme: Theme;
  image: EntryImage;
  alt?: string;
  layout?: Layout;
  version: string | null;
  savedHash: string | null;
  video?: EntryVideo;
};

export type ThemeColors = {
  background: string;
  ink: string;
  label: string;
};

export type System = {
  template: string;
  color: string;
  domain: string;
  font: { family: string; titleWeight: number; labelWeight: number };
  colors: { light: ThemeColors; dark: ThemeColors; panel: string };
  margin: number;
  textBottom: number;
  panelGap: number;
  panelWidth: number;
  labelSize: number;
  labelLineHeight: number;
  labelGap: number;
  lineHeight: number;
  titleSize: { min: number; max: number };
  maxLines: number;
};

export type Manifest = {
  system: System;
  entries: Entry[];
};

export type Box = { width: number; height: number };

export type ImageBox = { x: number; y: number; width: number; height: number };

export type TemplateUses = {
  theme: boolean;
  image: boolean;
  color: boolean;
};

export type SourceFile = {
  src: string;
  label: string;
  folder: string;
};

export type TitleFit = {
  size: number;
  lines: number;
  overflow: boolean;
};

export function isSheet(image: EntryImage): image is ImageSheet {
  return image != null && "sheet" in image;
}

export function isSource(image: EntryImage): image is ImageSource {
  return image != null && "src" in image;
}

/** A page with no image is type only, whatever `layout` says. */
export function resolveLayout(entry: { image: EntryImage; layout?: Layout }): Layout {
  if (entry.image == null) return "type-only";
  if (
    entry.layout === "type-only" ||
    entry.layout === "type-and-image" ||
    entry.layout === "image-only"
  ) {
    return entry.layout;
  }
  return "type-and-image";
}

export function imageSources(image: EntryImage): string[] {
  if (image == null) return [];
  if (isSheet(image)) return image.sheet;
  return [image.src];
}
