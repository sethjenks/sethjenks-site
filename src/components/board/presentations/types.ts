import type { AppIconMark } from "@/components/app-icon";
import type { CardMedia } from "@/components/board/card-media";

export const PRESENTATION_KINDS = ["phone", "desktop", "widget", "icon"] as const;

export type PresentationKind = (typeof PRESENTATION_KINDS)[number];

export type PresentationFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PresentationBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PresentationTile = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  resting: boolean;
  ring: number;
  shiftX: number;
  shiftY: number;
  image?: string;
  imagePosition?: string;
  aspect?: number;
  media?: CardMedia;
  icon?: {
    mark: AppIconMark;
    rounded: boolean;
  };
  label: string;
  description: string;
};

export type PresentationProject = {
  title: string;
  chips: readonly string[];
  href?: string;
};

export type PresentationSpec = {
  id: PresentationKind;
  label: string;
  openLabel: string;
  project: PresentationProject;
  closed: PresentationFrame;
  open: PresentationFrame;
  tiles: PresentationTile[];
};

export function isPresentationKind(value: unknown): value is PresentationKind {
  return typeof value === "string" && PRESENTATION_KINDS.some((kind) => kind === value);
}
